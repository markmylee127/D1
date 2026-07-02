// app/api/reviews/[id]/remark/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const attemptId = id;

  const supabase = await createSupabaseServerClient();

  // 1. Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  // 2. Body
  const body = await req.json();
  const answer = (body.answer as string | undefined)?.trim();

  if (!answer) {
    return NextResponse.json(
      { error: "Answer is required" },
      { status: 400 }
    );
  }

  // 3. Load attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select(
      "id, user_id, question, answer, question_image_url, ai_feedback, gap_explanation"
    )
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .single();

  if (attemptError || !attempt) {
    console.error("Attempt fetch failed:", attemptError);
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const questionText = attempt.question ?? "No text question provided.";

  // 4. Call OpenAI Responses API
  // We force the model to reply with a JSON object ONLY.
  const prompt = `
You are an expert VCE exam marker. Mark the student's answer strictly against the question.

Return ONLY a JSON object, no extra text, with this exact shape:

{
  "score": "correct" | "partially_correct" | "incorrect",
  "feedback": "string",
  "gap_explanation": "string",
  "ideal_answer": "string"
}

Question:
${questionText}

Student's new answer:
${answer}
`.trim();

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  // 5. Extract text from response.output safely
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstOutput = (response as any).output?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (firstOutput?.content?.[0] as any)?.text ?? "";

  let parsed: {
    score: string;
    feedback: string;
    gap_explanation: string;
    ideal_answer: string;
  };

  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI JSON:", e, text);
    return NextResponse.json(
      { error: "Failed to parse AI response" },
      { status: 500 }
    );
  }

  // 6. Save latest answer + feedback to this attempt
  const { error: updateError } = await supabase
    .from("attempts")
    .update({
      answer, // overwrite with latest answer
      ai_feedback: parsed.feedback,
      gap_explanation: parsed.gap_explanation,
    })
    .eq("id", attempt.id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Failed to save remark:", updateError);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }

  // 7. Return marking info
  return NextResponse.json({
    ok: true,
    score: parsed.score,
    feedback: parsed.feedback,
    gap_explanation: parsed.gap_explanation,
    ideal_answer: parsed.ideal_answer,
  });
}
