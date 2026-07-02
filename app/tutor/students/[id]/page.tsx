// app/tutor/students/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TopicStat = {
  name: string;
  count: number;
};

type Attempt = {
  id: string | number;
  question: string | null;
  status?: string | null;
  created_at: string;
  due_date?: string | null;
  topic?: string | null;
};

type StudentDetail = {
  user_id: string;
  attempts: Attempt[];
  stats: {
    total_attempts: number;
    consolidators_due: number;
    streak_days: number;
    top_topics: TopicStat[];
  };
};

function formatDate(s?: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleString();
}

export default function TutorStudentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        if (!id) return;
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/tutor/students/${id}`);
        if (!res.ok) {
          throw new Error(`Failed to load student (${res.status})`);
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err?.message ?? "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const attempts = data?.attempts ?? [];
  const stats = data?.stats;

  return (
    <main className="min-h-screen bg-black text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <button
          onClick={() => router.push("/tutor/dashboard")}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ← Back to tutor dashboard
        </button>

        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Student overview
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold">
            Student {id}
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            A consolidated view of this student&apos;s activity, weak
            topics, and Consolidators. Use this to plan your next session in
            minutes.
          </p>
        </header>

        {loading && (
          <div className="text-sm text-slate-400">
            Loading student data…
          </div>
        )}

        {error && !loading && (
          <div className="text-sm text-red-400">{error}</div>
        )}

        {!loading && !error && data && (
          <>
            {/* Stats row */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Total attempts
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {stats?.total_attempts ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Every attempt is a data point for planning.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Consolidators due
                </p>
                <p className="mt-2 text-2xl font-semibold text-amber-300">
                  {stats?.consolidators_due ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  How many high-impact reviews are ready for them.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Streak
                </p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">
                  {stats?.streak_days ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Days in a row they&apos;ve been active.
                </p>
              </div>
            </section>

            {/* Top topics / weak areas */}
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-100">
                Focus areas for next session
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                These topics appear most frequently in their recent attempts.
                Use them as anchors for your next lesson.
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                {(stats?.top_topics ?? []).length === 0 && (
                  <p className="text-xs text-slate-500">
                    Not enough data yet. Encourage the student to log more
                    attempts.
                  </p>
                )}
                {(stats?.top_topics ?? []).map((t) => (
                  <div
                    key={t.name}
                    className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs"
                  >
                    <p className="text-slate-100">{t.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {t.count} attempt{t.count === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent attempts / Consolidators */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-100">
                  Recent Consolidators & attempts
                </h2>
                <span className="text-xs text-slate-500">
                  Showing last {Math.min(6, attempts.length)} of{" "}
                  {attempts.length}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 divide-y divide-slate-900 overflow-hidden">
                {attempts.length === 0 && (
                  <div className="px-4 py-6 text-sm text-slate-400">
                    No attempts found for this student yet.
                  </div>
                )}

                {attempts
                  .slice(0, 6)
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() => router.push(`/reviews/${a.id}`)}
                      className="w-full text-left px-4 py-3.5 hover:bg-slate-900/80 transition flex items-center justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-slate-100 line-clamp-1">
                          {a.question ?? "Attempt with no question text"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(a.created_at)}
                          {a.topic && (
                            <>
                              {" · "}
                              <span>{a.topic}</span>
                            </>
                          )}
                          {a.status && (
                            <>
                              {" · "}
                              <span className="capitalize">
                                {a.status}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        Open Consolidator
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
