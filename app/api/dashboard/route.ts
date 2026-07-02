import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = auth.user.id;
  const nowIso = new Date().toISOString();

  // Attempts (recent)
  const { data: attempts, error: attemptsErr } = await supabase
    .from("attempts")
    .select("id, question, answer, status, created_at, due_date")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (attemptsErr) {
    return NextResponse.json({ error: attemptsErr.message }, { status: 500 });
  }

  // Due consolidators
  const { data: due, error: dueErr } = await supabase
    .from("consolidators")
    .select("id, title, due_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(50);

  if (dueErr) {
    return NextResponse.json({ error: dueErr.message }, { status: 500 });
  }

  return NextResponse.json({
    attempts: attempts ?? [],
    due: (due ?? []).map((row: any) => ({
      id: row.id,
      question: row.title ?? null,
      due_date: row.due_at ?? null,
    })),
    stats: {
      total_attempts: (attempts ?? []).length,
      mastered_count: (attempts ?? []).filter((a: any) => a.status === "mastered")
        .length,
    },
  });
}
