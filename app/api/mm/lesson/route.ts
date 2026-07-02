import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const concept = searchParams.get("concept");

  if (!concept) {
    return NextResponse.json(
      { error: "Missing concept parameter" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("mm_lessons")
    .select("*")
    .eq("concept_code", concept)
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Error fetching lesson", error);
    return NextResponse.json(
      { error: "Lesson not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
