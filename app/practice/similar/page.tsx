"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SimilarResponse = {
  question: string;
};

export default function SimilarQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const practiceAttemptId = searchParams.get("id");

  const [question, setQuestion] = useState<string>("");
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [answerText, setAnswerText] = useState("");
  const [answerImageFile, setAnswerImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load the similar question
  useEffect(() => {
    async function loadSimilar() {
      if (!practiceAttemptId) {
        setQuestionError("Missing attempt id");
        setLoadingQuestion(false);
        return;
      }

      try {
        setLoadingQuestion(true);
        setQuestionError(null);
        const res = await fetch(`/api/practice/similar?id=${practiceAttemptId}`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Failed to generate similar question");
        }
        const json = (await res.json()) as SimilarResponse;
        setQuestion(json.question);
      } catch (err: any) {
        console.error(err);
        setQuestionError(err.message || "Something went wrong");
      } finally {
        setLoadingQuestion(false);
      }
    }

    loadSimilar();
  }, [practiceAttemptId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);

    if (!practiceAttemptId) {
      setSaveError("Missing attempt id");
      return;
    }

    if (!question) {
      setSaveError("Similar question not loaded yet");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("practice_attempt_id", practiceAttemptId);
      formData.append("question_text", question);
      formData.append("answer_text", answerText);
      if (answerImageFile) {
        formData.append("answer_image", answerImageFile);
      }

      const res = await fetch("/api/practice/similar-answer", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save and mark answer");
      }

      const data = await res.json(); // { id: "<newAttemptId>" }
      router.push(`/reviews/${data.id}`);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to step 1
      </button>

      <section className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-400">
          Practice session
        </p>
        <h1 className="text-lg font-semibold">
          Step 2 · Tackle a similar question.
        </h1>
        <p className="text-xs text-neutral-400">
          Same concept, fresh question. Use this to lock in the idea.
        </p>
      </section>

      <div className="rounded-2xl bg-neutral-900/70 px-4 py-4 border border-neutral-800 space-y-3">
        <p className="text-xs uppercase tracking-wide text-neutral-400">
          Similar question
        </p>

        {loadingQuestion && (
          <p className="text-sm text-neutral-300">
            Generating a similar exam question…
          </p>
        )}

        {questionError && (
          <p className="text-sm text-red-400">{questionError}</p>
        )}

        {!loadingQuestion && !questionError && (
          <p className="text-sm text-neutral-100 whitespace-pre-wrap">
            {question}
          </p>
        )}
      </div>

      {/* Answer form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-xs uppercase tracking-wide text-neutral-400">
          Your answer
        </label>

        <textarea
          className="w-full rounded-xl border border-yellow-500/60 bg-black/40 px-3 py-3 text-sm text-neutral-100 outline-none focus:border-yellow-400"
          rows={8}
          placeholder="Write your full working as if this was exam conditions…"
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
        />

        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-wide text-neutral-400">
            Or upload a photo / PDF of your working
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) =>
              setAnswerImageFile(e.target.files?.[0] || null)
            }
            className="block text-sm text-neutral-200"
          />
          {answerImageFile && (
            <p className="text-xs text-neutral-400 mt-1">
              Selected: {answerImageFile.name}
            </p>
          )}
        </div>

        {saveError && (
          <p className="text-xs text-red-400">{saveError}</p>
        )}

        <div className="flex justify-between items-center">
          <p className="text-xs text-neutral-500">
            Your response will be saved as a new attempt and AI-marked
            immediately.
          </p>
          <button
            type="submit"
            disabled={saving || loadingQuestion || !!questionError}
            className="flex items-center justify-center rounded-full bg-yellow-500 px-5 py-2 text-sm font-medium text-black hover:bg-yellow-400 disabled:opacity-60"
          >
            {saving ? "Saving & marking…" : "Save & see feedback →"}
          </button>
        </div>
      </form>
    </div>
  );
}
