// app/api/tutor/students/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: "Missing student id in route params" },
        { status: 400 }
      );
    }

    // 1) Get all attempts for this student
    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Supabase error in /api/tutor/students/[id]:",
        error
      );
      return NextResponse.json(
        { error: error.message ?? "Supabase error" },
        { status: 500 }
      );
    }

    const attempts = data ?? [];

    // 2) Basic stats
    const totalAttempts = attempts.length;

    const nowIso = new Date().toISOString();
    const consolidatorsDue = attempts.filter(
      (a: any) => a.due_date && a.due_date <= nowIso
    ).length;

    // Streak calculation
    let streakDays = 0;
    if (attempts.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const days = new Set(
        attempts.map((a: any) => {
          const d = new Date(a.created_at);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })
      );

      const cursor = new Date(today);
      while (days.has(cursor.toISOString())) {
        streakDays++;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    // Topic stats (safe even if no topic column; defaults to "General")
    const topicCounts: Record<string, number> = {};
    for (const a of attempts as any[]) {
      const topic = a.topic || "General";
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }

    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));

    // 3) Response in the shape your frontend expects
    return NextResponse.json({
      user_id: userId,
      attempts,
      stats: {
        total_attempts: totalAttempts,
        consolidators_due: consolidatorsDue,
        streak_days: streakDays,
        top_topics: topTopics,
      },
    });
  } catch (err: any) {
    console.error(
      "Route error in /api/tutor/students/[id]:",
      err
    );
    return NextResponse.json(
      {
        error:
          err?.message ?? "Failed to load student detail",
      },
      { status: 500 }
    );
  }
}
