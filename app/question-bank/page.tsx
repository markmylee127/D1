"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UploadExamModal from "./UploadExamModal";

import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

// ---- Types ---- //
type Question = {
  id: string | number;
  text: string;
  image_url?: string | null; // for manual questions if any
  topic?: string | null;
  source?: string | null; // "manual" | "vcaa_upload"
  question_number?: number | null;
  created_at?: string | null;
  render_mode?: "text" | "image" | null;
  question_image_url?: string | null; // for cropped VCAA questions
};

// Renders plain text + inline $...$ maths nicely
function QuestionText({ value }: { value: string }) {
  const parts = value.split(/(\$[^$]+\$)/g);

  return (
    <p className="leading-relaxed text-sm sm:text-base">
      {parts.map((part, i) => {
        const isMath = part.startsWith("$") && part.endsWith("$");
        if (isMath) {
          const math = part.slice(1, -1); // remove surrounding $
          return <InlineMath key={i} math={math} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export default function QuestionBankPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // ---- Load questions from API ---- //
  async function loadQuestions() {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch("/api/questions");
      if (!res.ok) throw new Error("Failed to load questions");

      const json = await res.json();
      setQuestions(json.questions ?? json ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold">Question Bank</h1>
          <p className="text-sm text-slate-400">
            Upload VCAA questions or add custom problem sets for students to practice.
          </p>
        </header>

        {/* Top actions */}
        <section className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/question-bank/upload")}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
          >
            + Add / Upload Question
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            + Import VCAA exam (private)
          </button>

          <button
            onClick={loadQuestions}
            disabled={loading}
            className="ml-auto text-xs rounded-lg border border-slate-700 px-3 py-1 hover:bg-slate-900 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {/* Questions list */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium">All Questions</h2>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading questions...</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-slate-400">
              No questions yet. Add your own, or import a VCAA exam.
            </p>
          ) : (
            <ul className="space-y-3 max-h-[600px] overflow-auto pr-1">
              {questions.map((q) => (
                <li
                  key={q.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between gap-3 hover:bg-slate-900 transition"
                >
                  {/* Left: number + text/image */}
                  <div className="flex items-start gap-3 text-sm">
                    {/* Optional thumbnail for manual questions */}
                    {q.image_url && (
                      <img
                        src={q.image_url}
                        alt="Q"
                        className="h-10 w-10 rounded-md object-cover border border-slate-700 mt-0.5"
                      />
                    )}

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400">
                        {q.source === "vcaa_upload" && q.question_number != null
                          ? `Question ${q.question_number}`
                          : "Custom question"}
                      </p>

                      {/* MAIN CONTENT */}
                      {q.render_mode === "image" && q.question_image_url ? (
                        <img
                          src={q.question_image_url}
                          alt={`Question ${q.question_number ?? ""}`}
                          className="rounded-lg border border-slate-700 max-w-full"
                        />
                      ) : (
                        <div className="bg-slate-900/60 rounded-lg px-3 py-2">
                          <QuestionText value={q.text} />
                        </div>
                      )}

                      {q.topic && (
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                          {q.topic}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Practice Button */}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set("questionId", String(q.id));
                      params.set("qText", q.text || "");
                      if (q.question_image_url) {
                        params.set("qImg", q.question_image_url);
                      }
                      router.push(`/ai-mark?${params.toString()}`);
                    }}
                    className="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400"
                  >
                    Practice
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {showUploadModal && (
          <UploadExamModal onClose={() => setShowUploadModal(false)} />
        )}
      </div>
    </main>
  );
}
