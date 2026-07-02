// app/api/exams/import/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";

// Helper to safely extract plain text from Responses API
function extractOutputText(resp: any): string | null {
  if (!resp || !Array.isArray(resp.output)) return null;

  const first = resp.output[0];
  if (!first || !Array.isArray(first.content)) return null;

  const textBlock = first.content.find(
    (c: any) =>
      c &&
      c.type === "output_text" &&
      c.output_text &&
      typeof c.output_text.text === "string"
  );

  if (textBlock) return textBlock.output_text.text as string;

  const alt = first.content.find((c: any) => typeof c.text === "string");
  if (alt) return alt.text as string;

  return null;
}

// Remove ```json fences or leading "json" etc so JSON.parse won't choke
function cleanJsonString(raw: string): string {
  let s = raw.trim();

  if (s.startsWith("```")) {
    s = s.replace(/^```json/i, "").replace(/^```/i, "");
    if (s.endsWith("```")) {
      s = s.slice(0, -3);
    }
    s = s.trim();
  }

  if (s.toLowerCase().startsWith("json")) {
    s = s.slice(4).trim();
  }

  return s;
}

type ParsedQuestion = {
  number: number;
  text: string;
  subtopic?: string;
  page?: number; // 1-based
  is_long?: boolean;
  crop_box?: any; // ignored for now
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // 0) Get current user (for user_id)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      console.error("No auth user in exam import:", userErr);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 1) Read form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "Unnamed exam";
    const subject = (formData.get("subject") as string) || "VCE Maths Methods";
    const paperType = (formData.get("paper_type") as string) || "Exam 1";

    if (!file) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 }
      );
    }

    // Read PDF into memory (for potential future use; not needed for text-only)
    const arrayBuffer = await file.arrayBuffer();

    // 2) Upload PDF to Supabase storage
    const filePath = `vcaa_uploads/${crypto.randomUUID()}-${file.name}`;

    const { error: storageErr } = await supabase.storage
      .from("exam_uploads")
      .upload(filePath, arrayBuffer, {
        contentType: file.type || "application/pdf",
      });

    if (storageErr) {
      console.error("Storage error:", storageErr);
      throw new Error("Failed to upload exam file");
    }

    // 3) Create exam_papers row (include user_id)
    const { data: examPaper, error: examErr } = await supabase
      .from("exam_papers")
      .insert({
        user_id: user.id,
        name,
        subject,
        paper_type: paperType,
        file_path: filePath,
      })
      .select()
      .single();

    if (examErr || !examPaper) {
      console.error("exam_papers insert error:", examErr);
      throw new Error("Failed to create exam_papers row");
    }

    // 4) Send file to OpenAI & extract questions (TEXT ONLY for now)
    const openaiFile = await openai.files.create({
      file,
      purpose: "assistants",
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions:
        "You are a strict VCE Maths exam parser. " +
        "Given a VCAA-style exam paper, you must extract each question.\n\n" +
        "For EVERY question, return an object with:\n" +
        "- \"number\": integer question number\n" +
        "- \"text\": full question in English (maths in LaTeX inside $...$)\n" +
        "- \"subtopic\": short label (e.g. \"trigonometric functions\", \"probability\", \"integration\", etc.)\n" +
        "- \"page\": 1-based page number in the PDF where the question appears (best guess).\n" +
        "- \"is_long\": true if the question is long/complex, else false\n" +
        "- \"crop_box\": you may include a normalized crop box object if you like, " +
        "  but it will be ignored for now.\n\n" +
        "Return ONLY a JSON array (no markdown, no ```).",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Read the attached exam and extract ALL questions as described. " +
                "Be extremely careful to respect the JSON format.",
            },
            {
              type: "input_file",
              file_id: openaiFile.id,
            },
          ],
        },
      ],
      temperature: 0,
    });

    const rawText = extractOutputText(response) ?? "[]";
    const rawClean = cleanJsonString(rawText) || "[]";

    console.log(
      "OpenAI raw JSON for exam import (first 500 chars):",
      rawClean.slice(0, 500)
    );

    let parsed: ParsedQuestion[] = [];

    try {
      parsed = JSON.parse(rawClean);
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI:", rawClean);
      parsed = [];
    }

    if (!parsed.length) {
      return NextResponse.json({
        examPaper,
        questionsCreated: 0,
      });
    }

    // 5) Insert questions into exam_questions (TEXT ONLY)
    const rows = parsed.map((q) => {
      const page = q.page ?? null;

      return {
        exam_paper_id: examPaper.id,
        question_number: q.number,
        question_text: q.text,
        subject,
        subtopic: q.subtopic ?? null,
        source: "vcaa_upload",
        user_id: user.id,
        render_mode: "text", // no image mode for now
        question_image_url: null,
        page_number: page,
        crop_box: null,
      };
    });

    const { error: insertErr } = await supabase
      .from("exam_questions")
      .insert(rows);

    if (insertErr) {
      console.error("exam_questions insert error:", insertErr);
      throw new Error("Failed to insert exam questions");
    }

    return NextResponse.json({
      examPaper,
      questionsCreated: rows.length,
    });
  } catch (err: any) {
    console.error("Exam import error", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to import exam" },
      { status: 500 }
    );
  }
}
