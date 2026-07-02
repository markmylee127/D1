import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  // 1. Auth
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

  const nowIso = new Date().toISOString();

  // 2. Count due attempts
  const { count, error } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .lte("due_date", nowIso);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load due count" },
      { status: 500 }
    );
  }

  return NextResponse.json({ due: count ?? 0 });
}