// app/api/practice/derive-question/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";

// --- Helpers ---------------------------------------------------- //

function extractOutputText(response: any): string | null {
  if (!response?.output || !Array.isArray(response.output)) return null;
  const item = response.output[0];
  if (!item) return null;

  // Newer format
  if (
    item.type === "output_text" &&
    item.output_text &&
    typeof item.output_text.text === "string"
  ) {
    return item.output_text.text;
  }

  // Fallback older "content" array
  if (item.content && Array.isArray(item.content)) {
    const textPart = item.content.find((c: any) => typeof c.text === "string");
    if (textPart) return textPart.text;
  }

  return null;
}

// Very conservative “this is probably just a label, not a real question”
function looksLikeLabel(label: string | null | undefined): boolean {
  if (!label) return true;
  const trimmed = label.trim();
  if (trimmed.length < 8) return true; // too short to be a full question

  // TopicName (2), Logs (3), etc.
  if (/\(\d+\)$/.test(trimmed)) return true;

  const lower = trimmed.toLowerCase();
  const genericStarts = ["log based rules", "review", "practice", "attempt"];
  if (trimmed.length <= 30 && genericStarts.some((w) => lower.startsWith(w))) {
    return true;
  }

  return false;
}

// --- GET handler ------------------------------------------------ //

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const attemptId = url.searchParams.get("id");

    if (!attemptId) {
      return NextResponse.json(
        { error: "Missing attempt id" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Auth
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

    // Load the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id, user_id, question, question_image_url, answer_image_url")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      console.error(attemptError);
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    // Safety: ensure this attempt belongs to this user
    if (attempt.user_id && attempt.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not allowed to view this attempt" },
        { status: 403 }
      );
    }

    // If the stored question already looks like a real question, just return it.
    if (attempt.question && !looksLikeLabel(attempt.question)) {
      return NextResponse.json({ question: attempt.question });
    }

    // Prefer a dedicated question image; fall back to answer image
    const imageUrl: string | null =
      attempt.question_image_url ?? attempt.answer_image_url ?? null;

    if (!imageUrl) {
      // Nothing to work with – fall back to whatever label we have
      return NextResponse.json({
        question: attempt.question ?? "Question not available",
      });
    }

    // Ask OpenAI to rewrite just the problem statement from the exam photo
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Look at this exam page or written working and rewrite ONLY the original mathematics question the student is answering. " +
                "Do not include their working, scribbles, ticks, or any commentary. " +
                "Return a single, clear problem statement suitable to show as the original question.",
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high", // required for image inputs
            },
          ],
        },
      ],
    });

    const raw = extractOutputText(response);
    const cleaned = (raw ?? "").trim();

    if (!cleaned) {
      // Fallback – we tried, but could not extract
      return NextResponse.json({
        question: attempt.question ?? "Question not available",
      });
    }

    // Save back into the attempt so future sessions use the good question
    const { error: updateError } = await supabase
      .from("attempts")
      .update({ question: cleaned })
      .eq("id", attempt.id);

    if (updateError) {
      console.error("Failed to update attempt.question:", updateError);
      // but still return the cleaned question
    }

    return NextResponse.json({ question: cleaned });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
