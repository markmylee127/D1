"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartConsolidatorButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      const res = await fetch("/api/consolidators/start", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        alert(data?.error ?? "Failed to start consolidator");
        return;
      }

      router.push(data.next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full rounded-2xl px-6 py-5 text-lg font-semibold border"
    >
      {loading ? "Starting..." : "▶ Start Consolidator"}
    </button>
  );
}
