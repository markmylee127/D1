"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";

type Attempt = {
  id: string;
  question: string | null;
  question_image_url?: string | null;
  answer?: string | null;
  answer_image_url?: string | null;
};

function looksLikeLabel(label: string | null | undefined): boolean {
  if (!label) return true;
  const trimmed = label.trim();
  if (trimmed.length < 8) return true; // too short to be a whole exam question

  // TopicName (2), etc.
  if (/\(\d+\)$/.test(trimmed)) return true;

  const lower = trimmed.toLowerCase();
  const genericStarts = ["log based rules", "review", "practice", "attempt"];
  if (trimmed.length <= 30 && genericStarts.some((w) => lower.startsWith(w))) {
    return true;
  }

  return false;
}

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [displayQuestion, setDisplayQuestion] = useState<string>("");
  const [questionLoading, setQuestionLoading] = useState(false);

  const [workingText, setWorkingText] = useState("");
  const [answerImageFile, setAnswerImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load the original attempt
  useEffect(() => {
    async function loadAttempt() {
      try {
        setLoadingAttempt(true);
        setLoadError(null);

        const res = await fetch(`/api/reviews/${id}`);
        if (!res.ok) throw new Error("Could not load question");
        const json = (await res.json()) as Attempt;

        setAttempt(json);
      } catch (err: any) {
        setLoadError(err.message || "Failed to load");
      } finally {
        setLoadingAttempt(false);
      }
    }

    if (id) loadAttempt();
  }, [id]);

  // Decide what question text to show
  useEffect(() => {
    async function enhanceQuestion() {
      if (!attempt) return;

      // If it already looks like a full question, just use it
      if (attempt.question && !looksLikeLabel(attempt.question)) {
        setDisplayQuestion(attempt.question);
        return;
      }

      // Otherwise, try to derive it from the image(s)
      try {
        setQuestionLoading(true);
        const res = await fetch(`/api/practice/derive-question?id=${attempt.id}`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Failed to derive question");
        }
        const json = (await res.json()) as { question: string };
        setDisplayQuestion(json.question);
      } catch (err) {
        console.error(err);
        // fallback to whatever we have
        setDisplayQuestion(attempt.question ?? "Question not available");
      } finally {
        setQuestionLoading(false);
      }
    }

    if (attempt) {
      enhanceQuestion();
    }
  }, [attempt]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("working_text", workingText);
      if (answerImageFile) {
        formData.append("answer_image", answerImageFile);
      }

      const res = await fetch(`/api/reviews/${id}/practice`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save practice attempt");
      }

      const data = await res.json(); // { id: "<new practice attempt id>" }
      router.push(`/practice/similar?id=${data.id}`);
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
        onClick={() => router.back()}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to review card
      </button>

      <section className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-400">
          Practice session
        </p>
        <h1 className="text-lg font-semibold">
          Replay the same question, then tackle a similar one.
        </h1>
        <p className="text-xs text-neutral-400">
          This is where D1 turns a single mistake into real muscle memory.
        </p>
      </section>

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-neutral-400">
          Step 1 · Answer the same question again
        </p>

        <div className="rounded-2xl bg-neutral-900/70 px-4 py-3 text-sm text-neutral-100 border border-neutral-800">
          {loadingAttempt && <p>Loading question…</p>}
          {loadError && <p className="text-red-400 text-xs">{loadError}</p>}

          {!loadingAttempt && !loadError && (
            <>
              {questionLoading && (
                <p className="text-xs text-neutral-400">
                  Reading the question from your working image…
                </p>
              )}
              {!questionLoading && (
                <p className="whitespace-pre-wrap">{displayQuestion}</p>
              )}
            </>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-xs uppercase tracking-wide text-neutral-400">
          Your working
        </label>

        <textarea
          className="w-full rounded-xl border border-yellow-500/60 bg-black/40 px-3 py-3 text-sm text-neutral-100 outline-none focus:border-yellow-400"
          rows={8}
          placeholder="Write your full working as if this was exam conditions…"
          value={workingText}
          onChange={(e) => setWorkingText(e.target.value)}
        />

        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-wide text-neutral-400">
            Or upload a photo / PDF of your working
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setAnswerImageFile(e.target.files?.[0] || null)}
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

        <button
          type="submit"
          disabled={saving}
          className="ml-auto flex items-center justify-center rounded-full bg-yellow-500 px-5 py-2 text-sm font-medium text-black hover:bg-yellow-400 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Continue to similar question →"}
        </button>
      </form>
    </div>
  );
}
