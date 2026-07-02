"use client";

import { useState } from "react";
import Link from "next/link";

type SavedFile = {
  name: string;
  url: string;
  type: string;
};

type ProblemSet = {
  id: string;
  title: string;
  questionFiles: SavedFile[];
  answerFiles: SavedFile[];
};

type Topic = {
  id: string;
  name: string;
  problemSets: ProblemSet[];
};

export default function ConsolidatorsPage() {
  const [topics] = useState<Topic[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const saved = localStorage.getItem("d1-topics");

    if (saved) {
      return JSON.parse(saved);
    }

    return [];
  });

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl space-y-10">
        <header>
          <Link
            href="/dashboard"
            className="text-sm text-violet-300 hover:text-violet-200"
          >
            Back to Dashboard
          </Link>

          <p className="mt-8 text-xs uppercase tracking-[0.35em] text-slate-500">
            AI Consolidators
          </p>

          <h1 className="mt-3 text-4xl font-bold">Choose a Subject</h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Open a subject to see its subtopic forgetting curves and start a
            consolidator from the uploaded problem sets.
          </p>
        </header>

        {topics.length === 0 ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8">
            <h2 className="text-2xl font-bold">No subjects found</h2>
            <p className="mt-4 text-slate-400">
              Go back to the dashboard and create or upload a problem set first.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => {
              const questionCount = topic.problemSets.reduce(
                (total, problemSet) => total + problemSet.questionFiles.length,
                0
              );

              return (
                <Link
                  key={topic.id}
                  href={`/consolidators/${encodeURIComponent(topic.id)}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 transition hover:border-violet-400 hover:bg-slate-900"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Subject
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-white">
                    {topic.name}
                  </h2>
                  <p className="mt-4 text-sm text-slate-400">
                    {topic.problemSets.length} subtopic
                    {topic.problemSets.length === 1 ? "" : "s"} ·{" "}
                    {questionCount} question file
                    {questionCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-5 text-sm font-semibold text-violet-300">
                    Open subject
                  </p>
                </Link>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}
