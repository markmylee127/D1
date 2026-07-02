// app/exams/[slug]/attempt/page.tsx
"use client";

import { useState } from "react";
import { exams } from "../../examData";

type Params = {
  slug: string;
};

export default function ExamAttemptPage({ params }: { params: Params }) {
  const exam = exams[params.slug];

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!exam) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <h1 className="text-2xl font-bold">Exam not found</h1>
      </main>
    );
  }

  const current = exam.questions[index];

  async function submitAnswer() {
    if (!answer.trim()) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/ai-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: current.prompt,
          student_answer: answer,
        }),
      });

      const data = await res.json();
      setFeedback(data);
    } catch (err) {
      console.error(err);
      setFeedback({ feedback: "Something went wrong while marking this answer." });
    } finally {
      setLoading(false);
    }

    // Later: also save to Supabase attempts table here
  }

  function nextQuestion() {
    setIndex((prev) => prev + 1);
    setAnswer("");
    setFeedback(null);
  }

  const isLast = index === exam.questions.length - 1;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
        <p className="text-neutral-500 text-sm mb-6">
          Question {index + 1} of {exam.questions.length}
        </p>

        {/* Question */}
        <div className="mb-6">
          <p className="text-xl mb-2">{current.prompt}</p>
        </div>

        {/* Answer box */}
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your working here..."
          className="w-full h-40 p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-sm mb-4"
        />

        <button
          onClick={submitAnswer}
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Marking..." : "Submit answer"}
        </button>

        {/* Feedback */}
        {feedback && (
          <div className="mt-6 p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            <h3 className="text-lg font-semibold mb-2 text-blue-400">AI feedback</h3>
            <p className="text-neutral-300 text-sm mb-2">
              {feedback.feedback ?? "No feedback available."}
            </p>

            {feedback.correct_answer && (
              <p className="text-neutral-400 text-xs">
                <span className="text-neutral-500">Correct answer: </span>
                {feedback.correct_answer}
              </p>
            )}

            <div className="mt-4">
              {isLast ? (
                <a
                  href="/exams"
                  className="inline-block px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
                >
                  Finish exam
                </a>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
                >
                  Next question
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
