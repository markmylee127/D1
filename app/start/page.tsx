"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/consolidators/start", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? "Failed to start");
      if (!data?.next) throw new Error(data?.message ?? "No session available");

      router.push(data.next);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-sm text-zinc-400">One question · ~3 minutes</div>
        <h1 className="text-3xl font-semibold">Ready?</h1>

        <button
          onClick={start}
          disabled={loading}
          className="w-full rounded-xl px-4 py-3 font-medium bg-yellow-500 text-black disabled:opacity-60"
        >
          {loading ? "Starting..." : "Start"}
        </button>

        {err && <div className="text-sm text-red-400">{err}</div>}

        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          Review progress →
        </button>
      </div>
    </main>
  );
}
