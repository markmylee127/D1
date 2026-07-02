// app/api/reviews/[id]/practice/route.ts
import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ unwrap params (Next 16 canary)
    const { id } = await context.params;

    const supabase = await createSupabaseServerClient();

    // 0) Auth
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
    const workingText = (formData.get("working_text") as string) ?? "";
    const answerImageFile = formData.get("answer_image") as File | null;

    // 1) Find the original attempt (the card they are reviewing)
    const { data: originalAttempt, error: originalError } = await supabase
      .from("attempts")
      .select("*")
      .eq("id", id)
      .single();

    if (originalError || !originalAttempt) {
      console.error(originalError);
      return NextResponse.json(
        { error: "Original attempt not found" },
        { status: 404 }
      );
    }

    // 2) If an image was uploaded, save it to Storage
    let answerImageUrl: string | null = null;

    if (answerImageFile) {
      const arrayBuffer = await answerImageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 🔒 sanitise filename to avoid invalid key errors
      const originalName =
        (answerImageFile.name && answerImageFile.name.trim()) ||
        "answer.png";
      const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

      const path = `${user.id}/practice/${id}/${Date.now()}-${safeName}`;

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

    // 3) Create a NEW practice attempt row
    const { data: newAttempt, error: insertError } = await supabase
      .from("attempts")
      .insert({
        user_id: user.id,
        question: originalAttempt.question,
        question_image_url: originalAttempt.question_image_url ?? null,
        answer: workingText,
        answer_image_url: answerImageUrl,
        parent_attempt_id: originalAttempt.id,
        status: "practice",
      })
      .select()
      .single();

    if (insertError || !newAttempt) {
      console.error(insertError);
      return NextResponse.json(
        { error: "Failed to save practice attempt" },
        { status: 500 }
      );
    }

    // ✅ Return just the new practice attempt id
    return NextResponse.json({ id: newAttempt.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
