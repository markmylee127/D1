"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

type AiResponse = {
  feedback?: string | null;
  gap_explanation?: string | null;
};

// Generic text + inline LaTeX renderer
function MathText({ value }: { value: string }) {
  // Split on segments like $...$
  const parts = value.split(/(\$[^$]+\$)/g);

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
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

export default function AiMarkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-50" />}>
      <AiMarkContent />
    </Suspense>
  );
}

function AiMarkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [questionId, setQuestionId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionImageUrl, setQuestionImageUrl] = useState<string | null>(null);

  const [answerText, setAnswerText] = useState("");
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [answerImageFile, setAnswerImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [gapExplanation, setGapExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read URL params on first load
  useEffect(() => {
    const qId = searchParams.get("questionId");
    const qText = searchParams.get("qText");
    const qImg = searchParams.get("qImg");

    if (qId) setQuestionId(qId);
    if (qText) setQuestionText(qText);
    if (qImg) setQuestionImageUrl(qImg);
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setAiFeedback(null);
    setGapExplanation(null);

    try {
      const formData = new FormData();
      if (questionText) formData.append("question", questionText);
      if (answerText) formData.append("answer", answerText);
      if (questionId) formData.append("question_id", questionId);
      if (questionImageFile) formData.append("question_image", questionImageFile);
      if (answerImageFile) formData.append("answer_image", answerImageFile);

      const res = await fetch("/api/ai-mark", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to mark answer");
      }

      const json: AiResponse = await res.json();
      setAiFeedback(json.feedback ?? null);
      setGapExplanation(json.gap_explanation ?? null);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setAnswerText("");
    setQuestionImageFile(null);
    setAnswerImageFile(null);
    setAiFeedback(null);
    setGapExplanation(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 text-xs rounded-full border border-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-900"
        >
          ← Back to dashboard
        </button>

        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">
          AI marking — D1
        </h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Left side: form */}
          <section className="space-y-4">
            {/* If question came from bank, show it nicely */}
            {(questionText || questionImageUrl) && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400">
                  Question from bank
                </p>

                {questionImageUrl && (
                  <img
                    src={questionImageUrl}
                    alt="Question"
                    className="rounded-lg border border-slate-700 max-w-full"
                  />
                )}

                {questionText && <MathText value={questionText} />}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4"
            >
              {/* Question input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>QUESTION</span>
                  <span>Text + image both optional…</span>
                </div>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Paste the question (optional if uploading an image)…"
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[96px]"
                />
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <span className="rounded-full bg-slate-800 px-3 py-1 cursor-pointer hover:bg-slate-700">
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        setQuestionImageFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </span>
                  <span className="text-slate-500">
                    {questionImageFile
                      ? questionImageFile.name
                      : "No file chosen"}
                  </span>
                </label>
              </div>

              {/* Answer input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>YOUR WORKING / ANSWER</span>
                </div>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Write your working…"
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[120px]"
                />
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <span className="rounded-full bg-slate-800 px-3 py-1 cursor-pointer hover:bg-slate-700">
                    Upload working
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        setAnswerImageFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </span>
                  <span className="text-slate-500">
                    {answerImageFile
                      ? answerImageFile.name
                      : "No file chosen"}
                  </span>
                </label>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-950/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-slate-50 text-slate-950 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-60"
                >
                  {loading ? "Sending to AI..." : "Send to AI marking"}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear form
                </button>
              </div>
            </form>
          </section>

          {/* Right side: AI feedback */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 min-h-[140px]">
              <h2 className="text-xs font-semibold text-slate-400">
                AI FEEDBACK
              </h2>
              <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">
                {aiFeedback ? (
                  <MathText value={aiFeedback} />
                ) : (
                  <p>
                    After you submit, D1 will mark your reasoning like a VCE
                    tutor.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 min-h-[140px]">
              <h2 className="text-xs font-semibold text-slate-400">
                GAP IN UNDERSTANDING
              </h2>
              <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">
                {gapExplanation ? (
                  <MathText value={gapExplanation} />
                ) : (
                  <p>
                    D1 extracts one key misconception or skill to strengthen.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
