// app/api/ai-mark/route.ts
import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { openai } from "@/lib/openai";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/* --------------------------- TEXT EXTRACTOR --------------------------- */
function extractOutputText(response: any): string | null {
  if (!response) return null;

  if (response.output && Array.isArray(response.output)) {
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
      const t = item.content.find(
        (c: any) =>
          c.type === "output_text" &&
          c.output_text &&
          typeof c.output_text.text === "string"
      );
      if (t) return t.output_text.text;

      const legacy = item.content.find((c: any) => typeof c.text === "string");
      if (legacy) return legacy.text;
    }
  }

  return null;
}

/* --------------------------- HELPERS --------------------------- */

type MarkingResult = {
  feedback: string;
  gap_explanation: string;
  is_correct: boolean;
  model_solution: string;
};

async function uploadImageToSupabase(
  supabase: any,
  bucket: string,
  userId: string,
  file: File | null,
  kind: "question" | "answer"
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.split(".").pop() || "png";
  const filePath = `${userId}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: file.type || "image/png",
      upsert: false,
    });

  if (error) {
    console.error("Image upload failed:", error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data?.publicUrl ?? null;
}

function getNextDueDate(isCorrect: boolean): string {
  const next = new Date();
  next.setDate(next.getDate() + (isCorrect ? 2 : 1));
  return next.toISOString();
}

/* --------------------------- ROUTE HANDLER --------------------------- */

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const questionText = (formData.get("question") as string) || "";
    const answerText = (formData.get("answer") as string) || "";

    const questionImage = formData.get("question_image") as File | null;
    const answerImage = formData.get("answer_image") as File | null;

    const BUCKET = "attempt-images";

    const [questionImageUrl, answerImageUrl] = await Promise.all([
      uploadImageToSupabase(supabase, BUCKET, user.id, questionImage, "question"),
      uploadImageToSupabase(supabase, BUCKET, user.id, answerImage, "answer"),
    ]);

    /* --------------------------- VCE PROMPT --------------------------- */

    const tutorPrompt = `
You are a **VCE Mathematics (Methods & Specialist) expert tutor** on the D1 Education platform.

Follow the VCE Mathematics Study Design (2023–2027) and VCAA exam marking conventions.

You will receive:
- A question (text or image)
- A student's answer (text, image, or both)

Your job:
1. Mark the student's work exactly as a VCE examiner would.
2. Decide if their solution earns **full marks**. They must show:
   - Correct algebra
   - Correct reasoning
   - Correct domain restrictions (if applicable)
   - Correct exact values (π, √) unless decimals are required
   - Steps, not just answers
3. Identify **ONE key gap** in their understanding.
4. Provide a **FULL VCE-style worked solution**, line-by-line.

Return ONLY a JSON object of this shape:

type MarkingResult = {
  feedback: string;        // friendly, 3–8 sentences
  gap_explanation: string; // 1–3 sentences
  is_correct: boolean;     // true only if they earn full marks
  model_solution: string;  // full worked example
};

STYLE RULES:
- No LaTeX.
- Use π and √ symbols.
- Fractions: 3/4, 5π/3, √3/2.
- Write working clearly, like a VCE exam report.
- Do NOT shorten or skip steps.
- Even if the answer is perfect, still write a full model solution.
- MUST ALWAYS output proper JSON.

QUESTION:
${questionText || "(image-only question)"}

STUDENT ANSWER TEXT:
${answerText || "(no text answer provided)"}
`;

    /* --------------------------- OPENAI --------------------------- */

    const input: any[] = [];

    if (answerImageUrl) {
      input.push({
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              tutorPrompt +
              "\n\nBelow is the student's handwritten working. Consider it carefully:",
          },
          {
            type: "input_image",
            image_url: answerImageUrl, // MUST be string
          },
        ],
      });
    } else {
      input.push({
        role: "user",
        content: [
          {
            type: "input_text",
            text: tutorPrompt,
          },
        ],
      });
    }

    const aiResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input,
    });

    const rawText = extractOutputText(aiResponse);
    if (!rawText) throw new Error("No text returned from OpenAI.");

    let parsed: MarkingResult;

    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      console.error("JSON parse failed:", rawText);
      throw new Error("AI returned invalid JSON.");
    }

    const dueDate = getNextDueDate(parsed.is_correct);

    /* --------------------------- SAVE ATTEMPT --------------------------- */

    const { data: attempt } = await supabase
      .from("attempts")
      .insert({
        user_id: user.id,
        question: questionText || null,
        answer: answerText || null,
        question_image_url: questionImageUrl,
        answer_image_url: answerImageUrl,
        status: parsed.is_correct ? "correct" : "incorrect",
        ai_feedback: parsed.feedback,
        gap_explanation: parsed.gap_explanation,
        due_date: dueDate,
      })
      .select()
      .single();

    /* --------------------------- SAVE MISTAKE IF WRONG --------------------------- */

    if (!parsed.is_correct) {
      await supabase.from("mistakes").insert({
        user_id: user.id,
        subject: "VCE Maths Methods",
        subtopic: null,
        question: questionText || "(image-only question)",
        concept_gap: parsed.gap_explanation,
        correction: parsed.model_solution,
      });
    }

    /* --------------------------- RETURN --------------------------- */

    return NextResponse.json(
      {
        success: true,
        ...parsed,
        attempt,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("AI MARK ERROR:", err);
    return NextResponse.json(
      {
        error: "Failed to mark answer",
        details: err?.message,
      },
      { status: 500 }
    );
  }
}
