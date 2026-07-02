import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Simple spaced repetition ladder (edit anytime)
function nextIntervalDays(prevIntervalDays?: number | null) {
  const base = prevIntervalDays ?? 0;

  // If you don’t track intervals yet, you can just use a fixed sequence.
  // Example ladder: 1, 3, 7, 14, 30, 60
  if (base <= 0) return 1;
  if (base <= 1) return 3;
  if (base <= 3) return 7;
  if (base <= 7) return 14;
  if (base <= 14) return 30;
  return 60;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = auth.user.id;
  const attemptId = params.id;

  // Pull attempt + related consolidator
  const { data, error } = await supabase
    .from("consolidator_attempts")
    .select(
      `
      id,
      created_at,
      status,
      answer,
      ai_feedback,
      gap_explanation,
      question_image_url,
      answer_image_url,
      consolidator:consolidators (
        id,
        title,
        due_at,
        status,
        interval_days
      )
    `
    )
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "not_found", details: error?.message },
      { status: 404 }
    );
  }

  const consolidator = (data as any).consolidator;

  // Shape it exactly how your page expects
  return NextResponse.json({
    id: data.id,
    question: consolidator?.title ?? null,
    answer: data.answer ?? null,
    ai_feedback: data.ai_feedback ?? null,
    gap_explanation: data.gap_explanation ?? null,
    question_image_url: data.question_image_url ?? null,
    answer_image_url: data.answer_image_url ?? null,
    created_at: data.created_at,
    due_date: consolidator?.due_at ?? null,
    status: data.status ?? null,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = auth.user.id;
  const attemptId = params.id;

  const body = await req.json().catch(() => ({}));
  if (body?.action !== "mark_consolidated") {
    return NextResponse.json(
      { error: "bad_request", details: "Unknown action" },
      { status: 400 }
    );
  }

  // Load attempt + consolidator fields we need
  const { data: row, error: loadErr } = await supabase
    .from("consolidator_attempts")
    .select(
      `
      id,
      user_id,
      status,
      consolidator_id,
      consolidator:consolidators (
        id,
        due_at,
        interval_days,
        status,
        title
      )
    `
    )
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (loadErr || !row) {
    return NextResponse.json(
      { error: "not_found", details: loadErr?.message },
      { status: 404 }
    );
  }

  const consolidator = (row as any).consolidator;
  if (!consolidator?.id) {
    return NextResponse.json(
      { error: "broken_relation", details: "Attempt has no consolidator" },
      { status: 500 }
    );
  }

  const currentInterval = consolidator.interval_days ?? null;
  const nextDays = nextIntervalDays(currentInterval);
  const nextDue = addDays(new Date(), nextDays).toISOString();

  // 1) mark the attempt as mastered/done
  const { error: attemptErr } = await supabase
    .from("consolidator_attempts")
    .update({ status: "mastered" })
    .eq("id", attemptId)
    .eq("user_id", userId);

  if (attemptErr) {
    return NextResponse.json(
      { error: "failed_to_update_attempt", details: attemptErr.message },
      { status: 500 }
    );
  }

  // 2) schedule the consolidator (and store the new interval if you have that column)
  const { error: consErr } = await supabase
    .from("consolidators")
    .update({
      due_at: nextDue,
      interval_days: nextDays, // remove this line if you don't have interval_days column
      status: "active",
    })
    .eq("id", consolidator.id)
    .eq("user_id", userId);

  if (consErr) {
    return NextResponse.json(
      { error: "failed_to_update_consolidator", details: consErr.message },
      { status: 500 }
    );
  }

  // Return updated attempt-shaped payload (what your UI expects)
  return NextResponse.json({
    id: attemptId,
    question: consolidator.title ?? null,
    created_at: new Date().toISOString(),
    due_date: nextDue,
    status: "mastered",
  });
}