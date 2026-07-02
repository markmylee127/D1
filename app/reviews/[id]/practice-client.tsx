"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AttemptPayload = {
  id: string;
  question: string | null;
  answer: string | null;
  ai_feedback: string | null;
  gap_explanation: string | null;
  question_image_url: string | null;
  answer_image_url: string | null;
  created_at: string;
  due_date: string | null;
  status: string | null;
};

export default function PracticeClient({ attempt }: { attempt: AttemptPayload }) {
  const router = useRouter();
  const [working, setWorking] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function markConsolidated() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/consolidator-attempts/${attempt.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "mark_consolidated" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");

      // After marking, send them back to /start (Action Mode)
      router.push("/start");
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-start justify-center px-6 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-sm text-zinc-400">Practice Session</div>

        <h1 className="text-2xl md:text-3xl font-semibold">
          Replay the same question, then tackle a similar one.
        </h1>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="text-sm text-zinc-400 mb-2">Question</div>
          <div className="text-zinc-100 whitespace-pre-wrap">
            {attempt.question ?? "No question text found."}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="text-sm text-zinc-400 mb-2">Your working (anything is fine)</div>
          <textarea
            value={working}
            onChange={(e) => setWorking(e.target.value)}
            className="w-full min-h-[180px] rounded-xl bg-black/40 border border-zinc-800 p-3 text-zinc-100 outline-none focus:ring-2 focus:ring-yellow-500/40"
            placeholder="Write anything. Guessing is allowed."
          />
        </div>

        {attempt.ai_feedback && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="text-sm text-zinc-400 mb-2">Feedback</div>
            <div className="text-zinc-100 whitespace-pre-wrap">{attempt.ai_feedback}</div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/start")}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            ← Back (do later)
          </button>

          <button
            disabled={loading}
            onClick={markConsolidated}
            className="rounded-xl px-5 py-3 font-medium bg-yellow-500 text-black disabled:opacity-60"
          >
            {loading ? "Saving..." : "Mark consolidated →"}
          </button>
        </div>

        {err && <div className="text-sm text-red-400">{err}</div>}
      </div>
    </main>
  );
}
