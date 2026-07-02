// app/api/mistakes/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/mistakes
// Return all mistakes for the logged-in user
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error in /api/mistakes GET:", userError);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Load mistakes for this user
    const { data, error } = await supabase
      .from("mistakes")
      .select(
        `
        id,
        subject,
        subtopic,
        question,
        concept_gap,
        correction,
        answer_image_url,
        question_image_url,
        created_at
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load mistakes:", error);
      return NextResponse.json(
        {
          error: "Failed to load mistakes",
          details: error.message ?? error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ mistakes: data ?? [] });
  } catch (err: any) {
    console.error("Unexpected error in /api/mistakes GET:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}