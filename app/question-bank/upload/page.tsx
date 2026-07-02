"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function QuestionUploadPage() {
  const router = useRouter();

  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!text.trim() && !imageFile) {
      setError("Please type the question or upload an image.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      if (text.trim()) formData.append("text", text.trim());
      if (topic.trim()) formData.append("topic", topic.trim());
      if (imageFile) formData.append("image", imageFile); // field name: "image"

      const res = await fetch("/api/questions", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to upload question");
      }

      setSuccess("Question saved to bank ✅");
      setText("");
      setTopic("");
      setImageFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong saving the question.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Back link */}
        <button
          onClick={() => router.push("/question-bank")}
          className="text-xs text-sky-400 hover:underline"
        >
          ← Back to Question Bank
        </button>

        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Upload Question
          </h1>
          <p className="text-sm text-slate-400">
            Add a new question to your bank. You can include text, an image, or
            both.
          </p>
        </header>

        {/* Form */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Question text */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Question text
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 min-h-[80px]"
                placeholder="Type or paste the question statement here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                Optional if you’re uploading a clear image of the question.
              </p>
            </div>

            {/* Topic / tag */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Topic / tag (optional)
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                placeholder="e.g. Methods – Transformations, Chemistry – Redox"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Question image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-slate-700"
              />
              {imageFile && (
                <p className="text-[11px] text-slate-400">
                  Selected: {imageFile.name}
                </p>
              )}
              <p className="text-[11px] text-slate-500">
                Use a clear crop of the question from VCAA / textbook / worksheet.
              </p>
            </div>

            {/* Messages */}
            {error && (
              <div className="rounded-xl border border-red-500/60 bg-red-950/50 px-3 py-2 text-xs text-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-500/60 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
                {success}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save question"}
              </button>
              
              <button
                type="button"
                onClick={() => router.push("/question-bank")}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900"
              >
                Cancel
              </button>
              
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
