// app/api/reviews/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

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

  const { data: attempt, error } = await supabase
    .from("attempts")
    .select(
      `
      id,
      user_id,
      question,
      answer,
      question_image_url,
      answer_image_url,
      ai_feedback,
      gap_explanation,
      created_at,
      due_date
      `
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !attempt) {
    console.error("Attempt fetch failed:", error);
    return NextResponse.json(
      { error: "Attempt not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(attempt);
}
