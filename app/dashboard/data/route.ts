// app/dashboard/data/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get logged-in user
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

    // ----- Recent attempts (last 10) -----
    const { data: attempts, error: attemptsError } = await supabase
      .from("attempts")
      .select(
        `
        id,
        question,
        answer,
        status,
        created_at,
        due_date,
        ai_score,
        ai_feedback,
        correct_answer,
        gap_analysis,
        image_url
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (attemptsError) {
      console.error("Error loading attempts:", attemptsError);
      return NextResponse.json(
        { error: "Failed to load attempts" },
        { status: 500 }
      );
    }

    // ----- Due cards for review queue -----
    const nowIso = new Date().toISOString();

    const { data: due, error: dueError } = await supabase
      .from("attempts")
      .select(
        `
        id,
        question,
        due_date
      `
      )
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .lte("due_date", nowIso)
      .order("due_date", { ascending: true });

    if (dueError) {
      console.error("Error loading due attempts:", dueError);
      return NextResponse.json(
        { error: "Failed to load review queue" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attempts: attempts ?? [],
      due: due ?? [],
    });
  } catch (err: any) {
    console.error("Unexpected error in /dashboard/data:", err);
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
