// app/api/tutor/dashboard/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // 1) Load all attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from("attempts")
      .select("*");

    if (attemptsError) throw attemptsError;

    const allAttempts = attempts ?? [];

    // 2) Get distinct user_ids from attempts
    const userIds = Array.from(
      new Set(
        allAttempts
          .map((a: any) => a.user_id)
          .filter((id) => !!id)
      )
    );

    // 3) Try to load profile info if you have a `profiles` table
    let profilesById: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (!profilesError && profiles) {
        profilesById = profiles.reduce(
          (acc: Record<string, any>, p: any) => {
            acc[p.id] = p;
            return acc;
          },
          {}
        );
      }
    }

    // 4) Group attempts by user_id
    const students = userIds.map((uid) => {
      const userAttempts = allAttempts.filter(
        (a: any) => a.user_id === uid
      );

      // streak
      let streakDays = 0;
      if (userAttempts.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = new Set(
          userAttempts.map((a: any) => {
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

      const nowIso = new Date().toISOString();
      const consolidatorsDue = userAttempts.filter(
        (a: any) => a.due_date && a.due_date <= nowIso
      ).length;

      const topicCounts: Record<string, number> = {};
      userAttempts.forEach((a: any) => {
        const topic = a.topic || "General";
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
      const recentTopics = Object.keys(topicCounts)
        .sort((a, b) => topicCounts[b] - topicCounts[a])
        .slice(0, 3);

      const profile = profilesById[uid];
      const displayName =
        profile?.full_name || profile?.name || uid;

      return {
        id: uid,
        name: displayName,
        email: profile?.email ?? "",
        attempts: userAttempts,
        stats: {
          total_attempts: userAttempts.length,
          consolidators_due: consolidatorsDue,
          streak_days: streakDays,
          recent_topics: recentTopics,
        },
      };
    });

    return NextResponse.json({ students });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load tutor dashboard" },
      { status: 500 }
    );
  }
}
