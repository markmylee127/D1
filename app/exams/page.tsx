"use client";

import Link from "next/link";

export default function ExamsPage() {
  const exams = [
    {
      title: "Methods Mock Exam 1",
      desc: "Non-calculator exam modeled on VCAA Exam 1.",
      href: "/exams/methods-mock1",
    },
    {
      title: "Methods Mock Exam 2",
      desc: "Calculator exam modeled on VCAA Exam 2.",
      href: "/exams/methods-mock2",
    },
    {
      title: "Specialist Mock Exam 1",
      desc: "Exam 1 for Specialist Maths at a challenge level.",
      href: "/exams/spesh-mock1",
    },
    {
      title: "Specialist Mock Exam 2",
      desc: "Exam 2 for Specialist Maths at high difficulty.",
      href: "/exams/spesh-mock2",
    },
    {
      title: "Chemistry Short Answer Set A",
      desc: "Short answer questions with multi-step reasoning.",
      href: "/exams/chem-shortA",
    },
    {
      title: "Chemistry Structured Set A",
      desc: "Extended-response questions mapped to Study Design.",
      href: "/exams/chem-structuredA",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white px-4">
      <div className="max-w-6xl mx-auto py-16">

        <h1 className="text-4xl font-bold mb-6">
          VCE Mock Exams
        </h1>
        <p className="text-neutral-400 max-w-2xl mb-10">
          High-quality exam-style questions designed for real VCAA performance.
          Choose a set below to begin practicing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam) => (
            <Link
              key={exam.title}
              href={exam.href}
              className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition shadow-sm hover:shadow-md"
            >
              <h2 className="text-lg font-semibold mb-2">{exam.title}</h2>
              <p className="text-neutral-400 text-sm">{exam.desc}</p>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
