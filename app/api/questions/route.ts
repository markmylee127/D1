// app/api/questions/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Buffer } from "buffer";

// =======================
// GET: load question bank
// =======================
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      console.error("questions route: no auth user", userErr);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 1. Manual questions
    const { data: manual, error: manualErr } = await supabase
      .from("questions")
      .select("id, question, question_image_url, topic, source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (manualErr) {
      console.error("questions route: manualErr", manualErr);
    }

    // 2. Exam questions
    const { data: examQs, error: examErr } = await supabase
      .from("exam_questions")
      .select(
        "id, question_text, question_number, subtopic, created_at, source"
      )
      .eq("user_id", user.id)
      .order("question_number", { ascending: true });

    if (examErr) {
      console.error("questions route: examErr", examErr);
    }

    // 3. Merge + normalise
    const questions = [
      ...(manual ?? []).map((q) => ({
        id: q.id,
        text: q.question,
        image_url: q.question_image_url,
        topic: q.topic,
        source: q.source ?? "manual",
        question_number: null as number | null,
        created_at: q.created_at,
      })),
      ...(examQs ?? []).map((q) => ({
        id: q.id,
        text: q.question_text,
        image_url: null as string | null,
        topic: q.subtopic,
        source: q.source ?? "vcaa_upload",
        question_number: q.question_number as number | null,
        created_at: q.created_at,
      })),
    ];

    questions.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json({ questions });
  } catch (err: any) {
    console.error("questions route error", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to load questions" },
      { status: 500 }
    );
  }
}

// =======================
// POST: upload new question
// =======================
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      console.error("questions POST: no auth user", userErr);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    // Try multiple possible field names just in case
    const questionText =
      (formData.get("question") as string | null) ||
      (formData.get("question_text") as string | null) ||
      (formData.get("text") as string | null);

    const topic =
      (formData.get("topic") as string | null) ||
      (formData.get("tag") as string | null) ||
      null;

    const imageFile =
      (formData.get("image") as File | null) ||
      (formData.get("question_image") as File | null) ||
      null;

    if (!questionText || questionText.trim() === "") {
      return NextResponse.json(
        { error: "Missing question text" },
        { status: 400 }
      );
    }

    let questionImageUrl: string | null = null;

    // Optional image upload
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const bytes = Buffer.from(arrayBuffer);
      const path = `questions/${user.id}/${Date.now()}-${imageFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("questions")
        .upload(path, bytes, {
          contentType: imageFile.type,
        });

      if (uploadError) {
        console.error("questions POST: image upload error", uploadError);
        return NextResponse.json(
          { error: "Failed to upload question image" },
          { status: 500 }
        );
      }

      const { data } = supabase.storage.from("questions").getPublicUrl(path);
      questionImageUrl = data.publicUrl;
    }

    // Insert into questions table
    const { error: insertError } = await supabase.from("questions").insert({
      user_id: user.id,
      question: questionText,
      topic,
      source: "manual",
      question_image_url: questionImageUrl,
    });

    if (insertError) {
      console.error("questions POST: insert error", insertError);
      return NextResponse.json(
        { error: "Failed to save question" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("questions POST: server error", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
