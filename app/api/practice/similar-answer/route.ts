// app/api/practice/similar-answer/route.ts
import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";

// Same extractor style as your ai-mark route
function extractOutputText(response: any): string | null {
  if (!response?.output || !Array.isArray(response.output)) return null;
  const item = response.output[0];
  if (!item) return null;

  if (
    item.type === "output_text" &&
    item.output_text &&
    typeof item.output_text.text === "string"
  ) {
    return item.output_text.text;
  }

  if (item.content && Array.isArray(item.content)) {
    const textPart = item.content.find((c: any) => typeof c.text === "string");
    if (textPart) return textPart.text;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // 1) Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const practiceAttemptId = formData.get("practice_attempt_id") as string;
    const questionText = (formData.get("question_text") as string) ?? "";
    const answerText = (formData.get("answer_text") as string) ?? "";
    const answerImageFile = formData.get("answer_image") as File | null;

    if (!practiceAttemptId) {
      return NextResponse.json(
        { error: "Missing practice_attempt_id" },
        { status: 400 }
      );
    }

    // 2) Load the practice attempt (for concept_code etc.)
    const { data: practiceAttempt, error: practiceError } = await supabase
      .from("attempts")
      .select("id, concept_code")
      .eq("id", practiceAttemptId)
      .single();

    if (practiceError || !practiceAttempt) {
      console.error(practiceError);
      return NextResponse.json(
        { error: "Practice attempt not found" },
        { status: 404 }
      );
    }

    // 3) Upload answer image if provided
    let answerImageUrl: string | null = null;

    if (answerImageFile) {
      const arrayBuffer = await answerImageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const originalName =
        (answerImageFile.name && answerImageFile.name.trim()) ||
        "answer.png";
      const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

      const path = `${user.id}/similar/${practiceAttemptId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("attempt-images")
        .upload(path, buffer, {
          contentType: answerImageFile.type || "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload answer image" },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from("attempt-images")
        .getPublicUrl(path);

      answerImageUrl = publicUrlData.publicUrl;
    }

    // 4) Insert new attempt for the similar question
    const { data: newAttempt, error: insertError } = await supabase
      .from("attempts")
      .insert({
        user_id: user.id,
        question: questionText,
        question_image_url: null,
        concept_code: practiceAttempt.concept_code ?? null,
        answer: answerText,
        answer_image_url: answerImageUrl,
        parent_attempt_id: practiceAttempt.id,
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !newAttempt) {
      console.error(insertError);
      return NextResponse.json(
        { error: "Failed to save similar-question attempt" },
        { status: 500 }
      );
    }

    // 5) AI-mark the new attempt
    const prompt = `
You are a VCE Mathematics examiner.

You are given:
- A VCE-style question.
- A student's full working/answer.

Your tasks:
1. Mark the response as either "correct" or "incorrect".
2. Give short, concrete feedback on what they did well or poorly.
3. Explain the key conceptual gap in 2–4 sentences, focusing on ideas, not just algebra steps.

Return a single JSON object with the shape:
{
  "status": "correct" | "incorrect",
  "feedback": "short paragraph to the student",
  "gap_explanation": "short paragraph describing the core misunderstanding"
}

Question:
${questionText}

Student answer:
${answerText || "(answer uploaded as image)"}
    `.trim();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = extractOutputText(response);
    let parsed: {
      status?: string;
      feedback?: string;
      gap_explanation?: string;
    } = {};

    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse AI JSON:", e, raw);
      }
    }

    const status =
      parsed.status === "correct" || parsed.status === "incorrect"
        ? parsed.status
        : "incorrect";

    // 6) Update attempt with AI feedback
    const { error: updateError } = await supabase
      .from("attempts")
      .update({
        status,
        ai_feedback: parsed.feedback ?? null,
        gap_explanation: parsed.gap_explanation ?? null,
      })
      .eq("id", newAttempt.id);

    if (updateError) {
      console.error(updateError);
      // still return success, since attempt is created
    }

    return NextResponse.json({ id: newAttempt.id, status });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
