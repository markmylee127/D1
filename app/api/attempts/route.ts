// app/api/attempts/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    // 1️⃣ Create server-side Supabase client
    const supabase = await createSupabaseServerClient();

    // 2️⃣ Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("No authenticated user", userError);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 3️⃣ Parse request body
    const body = await req.json();
    const question =
      typeof body?.question === "string" ? body.question.trim() : "";
    const answer =
      typeof body?.answer === "string" ? body.answer.trim() : "";

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Missing question or answer" },
        { status: 400 }
      );
    }

    // 4️⃣ Spaced-repetition data
    const now = new Date();
    const due = new Date(now);
    due.setDate(due.getDate() + 1);

    // 5️⃣ Insert attempt into Supabase
    const { data, error } = await supabase
      .from("attempts")
      .insert({
        question,
        answer,
        status: "pending",
        created_at: now.toISOString(),
        due_date: due.toISOString().slice(0, 10),
      })
      .select("*")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 6️⃣ Success!
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Error in /api/attempts:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to create attempt" },
      { status: 500 }
    );
  }
}
