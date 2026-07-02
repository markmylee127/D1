"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Student = {
  id: string;
  email: string;
  name: string;
  attempts: any[];
  stats: {
    total_attempts: number;
    consolidators_due: number;
    streak_days: number;
    recent_topics: string[];
  };
};

export default function TutorDashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch("/api/tutor/dashboard");
        if (!res.ok) throw new Error("Failed to load tutor dashboard");

        const json = await res.json();
        setStudents(json.students);
      } catch (err: any) {
        setError(err?.message ?? "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-black text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Tutor Control Panel
          </p>
          <h1 className="text-3xl font-semibold">Your Students</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            D1 summarises each student’s weaknesses, recent activity, and
            Consolidators so you can run efficient tutoring sessions.
          </p>
        </header>

        {loading && (
          <div className="text-slate-400 text-sm">Loading students…</div>
        )}

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        {!loading && !error && (
          <section className="space-y-4">
            {students.length === 0 && (
              <p className="text-sm text-slate-400">
                No students found.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((student) => (
                <button
                  key={student.id}
                  className="text-left rounded-2xl border border-slate-800 bg-slate-950/70 p-5 hover:bg-slate-900 transition"
                  onClick={() => router.push(`/tutor/students/${student.id}`)}
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {student.name}
                  </p>
                  <p className="text-xs text-slate-500">{student.email}</p>

                  <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                    <div className="rounded-xl bg-black/40 p-3 text-xs">
                      <p className="text-slate-300">
                        {student.stats.total_attempts}
                      </p>
                      <p className="text-slate-500">Attempts</p>
                    </div>

                    <div className="rounded-xl bg-black/40 p-3 text-xs">
                      <p className="text-amber-300">
                        {student.stats.consolidators_due}
                      </p>
                      <p className="text-slate-500">Due</p>
                    </div>

                    <div className="rounded-xl bg-black/40 p-3 text-xs">
                      <p className="text-emerald-300">
                        {student.stats.streak_days}
                      </p>
                      <p className="text-slate-500">Streak</p>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-slate-400">
                    <p className="uppercase tracking-wider text-[10px] mb-1 text-slate-500">
                      Recent topics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {student.stats.recent_topics.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-slate-800 rounded-full text-[11px] text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
