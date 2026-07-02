// app/exams/[slug]/page.tsx

import Link from "next/link";
import { exams, ExamQuestion } from "../examData";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exam = exams[slug];

  if (!exam) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <h1 className="text-2xl font-bold mb-2">Exam not found</h1>
        <p className="text-neutral-400 text-sm">
          The exam you’re looking for does not exist.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-3">{exam.title}</h1>
        <p className="text-neutral-400 mb-8">{exam.description}</p>

        <h2 className="text-xl font-semibold mb-2">Questions included</h2>
        <ul className="mb-8 space-y-2 text-neutral-300 text-sm">
          {exam.questions.map((q: ExamQuestion) => (
            <li key={q.id}>• {q.prompt}</li>
          ))}
        </ul>

        <Link
          href={`/exams/${slug}/attempt`}
          className="inline-block px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 transition"
        >
          Start exam
        </Link>
      </div>
    </main>
  );
}
