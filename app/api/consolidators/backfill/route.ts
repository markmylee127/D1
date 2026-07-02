// app/api/consolidators/backfill/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    // Must be logged in (uses browser session cookies)
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = auth.user.id;

    // ✅ IMPORTANT: include attempt id
    const { data: attempts, error: aErr } = await supabase
      .from("attempts")
      .select("id, question, due_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (aErr) {
      return NextResponse.json({ error: aErr.message }, { status: 500 });
    }

    const rows = (attempts ?? []).filter(
      (a: any) => (a.question ?? "").trim().length > 0
    );

    if (!rows.length) {
      return NextResponse.json({
        created: 0,
        skipped: 0,
        message: "No attempts found to backfill.",
      });
    }

    // De-dupe: don't create a consolidator for attempts we already linked
    // (This is stronger than title de-dupe)
    const { data: existing, error: eErr } = await supabase
      .from("consolidators")
      .select("attempt_id")
      .eq("user_id", userId);

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 500 });
    }

    const existingAttemptIds = new Set(
      (existing ?? [])
        .map((x: any) => x.attempt_id)
        .filter(Boolean)
    );

    const nowIso = new Date().toISOString();

    // consolidators.subject is NOT NULL in your DB
    const DEFAULT_SUBJECT = "Unsorted";

    // ✅ Insert consolidators linked to attempts
    const toInsert = rows
      .filter((a: any) => !existingAttemptIds.has(a.id))
      .map((a: any) => ({
        user_id: userId,
        title: (a.question ?? "").trim(),
        subject: DEFAULT_SUBJECT,
        status: "due",
        attempt_id: a.id, // ✅ KEY FIX: link consolidator → attempt

        // ✅ Use due_date (since you added it)
        // If attempt.due_date exists use it, else due now
        due_date: a.due_date ?? nowIso,

        interval_days: 0,
        ease: 2.5,
        streak: 0,
      }));

    if (!toInsert.length) {
      return NextResponse.json({
        created: 0,
        skipped: rows.length,
        message: "Nothing to backfill (already exists).",
      });
    }

    const { error: insErr } = await supabase.from("consolidators").insert(toInsert);

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      created: toInsert.length,
      skipped: rows.length - toInsert.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
