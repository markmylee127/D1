// app/api/practice/similar/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";

// Same helper style as your ai-mark route
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

  // Fallback older content array
  if (item.content && Array.isArray(item.content)) {
    const textPart = item.content.find((c: any) => typeof c.text === "string");
    if (textPart) return textPart.text;
  }

  return null;
}

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

    // Optional: ensure user is logged in
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

    // 1) Get the original attempt (and its concept)
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("question, concept_code")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      console.error(attemptError);
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    const originalQuestion: string =
      attempt.question || "No question text available";
    const conceptCode: string = attempt.concept_code || "UNKNOWN_CONCEPT";

    // 2) Ask OpenAI for a similar question
    const prompt = `
You are a VCE Mathematics Methods exam writer.

Write ONE new exam-style question that:
- tests the SAME core concept as the original question
- is similar in difficulty
- is NOT a trivial rewording
- is self-contained and clear
- uses ONLY plain text, with simple line breaks
- does NOT use LaTeX or math delimiters like \\( \\), \\[ \\], \\begin{cases}, etc.
- does NOT include solutions, marking scheme, or commentary.

Original question:
${originalQuestion}

Concept code (internal taxonomy):
${conceptCode}

Return ONLY the new question text. Do not include any headings or labels.
`.trim();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const text = extractOutputText(response);

    if (!text) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

  function cleanQuestionText(raw: string): string {
  return raw
    // remove inline/display math wrappers
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    // remove cases env but keep line breaks
    .replace(/\\begin\{cases\}/g, "")
    .replace(/\\end\{cases\}/g, "")
    // turn LaTeX line breaks into real line breaks
    .replace(/\\\\/g, "\n")
    // collapse multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
  
    return NextResponse.json({ question: cleanQuestionText(text) });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
