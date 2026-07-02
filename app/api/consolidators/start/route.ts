import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { next: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Only pick consolidators that can actually open a practice page
    // (attempt_id OR review_id must exist)
    const { data: consolidator, error } = await supabase
      .from("consolidators")
      .select("id, due_date, attempt_id, review_id")
      .eq("user_id", user.id)
      .or("attempt_id.not.is.null,review_id.not.is.null")
      .order("due_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { next: null, error: error.message },
        { status: 500 }
      );
    }

    // ✅ Nothing due / nothing linkable
    if (!consolidator) {
      return NextResponse.json({
        next: null,
        message: "No consolidators due (or none linked yet).",
      });
    }

    // ✅ Use the id type your practice page expects (/api/reviews/:id)
    const targetId = consolidator.review_id ?? consolidator.attempt_id ?? null;

    if (!targetId) {
      // (Shouldn't happen because of the `.or(...)` filter, but keep it safe)
      return NextResponse.json({
        next: null,
        error: "Selected consolidator has no review_id/attempt_id.",
      });
    }

    const next = `/reviews/${targetId}/practice`;

    return NextResponse.json({
      next,
      redirectPath: next, // optional compatibility
    });
  } catch (err: any) {
    return NextResponse.json(
      { next: null, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}