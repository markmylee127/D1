"use client";

import { useState } from "react";

type Props = {
  question: string;
  questionImageUrl: string | null;
  subject?: string | null;
  subtopic?: string | null;
  onFinished?: (attempt: any) => void;
};

export function ReattemptForm({
  question,
  questionImageUrl,
  subject = "VCE Maths Methods",
  subtopic = null,
  onFinished,
}: Props) {
  const [typedAnswer, setTypedAnswer] = useState("");
  const [answerImageFile, setAnswerImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number;
    feedback: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!typedAnswer.trim() && !answerImageFile) {
      setError("Please type an answer or upload an image.");
      return;
    }

    const formData = new FormData();
    // send the question text so the AI can mark it
    formData.append("question", question);

    // answer text (if any)
    if (typedAnswer.trim().length > 0) {
      formData.append("answer", typedAnswer.trim());
    }

    // image (if any) – backend expects the field name "image"
    if (answerImageFile) {
      formData.append("image", answerImageFile);
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/ai-mark", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    // Update local result UI
    setResult({
      score: data.ai_score,
      feedback: data.ai_feedback,
    });

    // Let parent know a new attempt was saved (optional)
    if (onFinished) {
      onFinished(data.attempt);
    }

    // Clear inputs
    setTypedAnswer("");
    setAnswerImageFile(null);
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-4">
      <h3 className="text-base font-semibold">Reattempt this question</h3>

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <textarea
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
          rows={4}
          placeholder="Type your new answer here..."
          value={typedAnswer}
          onChange={(e) => setTypedAnswer(e.target.value)}
        />

        <div className="space-y-1">
          <label className="text-xs text-slate-400">
            Or upload a new photo of your working
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setAnswerImageFile(e.target.files?.[0] ?? null)
            }
            className="block w-full text-xs text-slate-300"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (!typedAnswer && !answerImageFile)}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? "Marking..." : "Submit reattempt"}
        </button>

        {error && (
          <p className="text-xs text-red-300 mt-1">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3 space-y-1">
          <p className="text-xs text-slate-300">
            New score: <span className="font-semibold">{result.score}/10</span>
          </p>
          <p className="text-xs text-slate-400 whitespace-pre-line">
            {result.feedback}
          </p>
        </div>
      )}
    </div>
  );
}
