import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("attempts")
    .select("id, due_date")
    .eq("user_id", user.id)
    .lte("due_date", new Date().toISOString())
    .order("due_date", { ascending: true })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch next card" }, { status: 500 });
  }

  return NextResponse.json({ nextId: data?.[0]?.id ?? null });
}
