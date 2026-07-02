"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-black text-slate-50">
      <h1 className="text-4xl font-bold">D1 Education</h1>
      <p className="text-lg text-slate-300 max-w-xl text-center">
        Master VCE Methods &amp; Chemistry with AI-powered mistake tracking and spaced-repetition review.
      </p>

      <div className="flex gap-4">
        <button
          className="px-6 py-3 rounded-xl bg-white text-black text-sm font-medium"
          onClick={() => router.push("/login")}
        >
          Log in / Sign up
        </button>

        <button
          className="px-6 py-3 rounded-xl border border-slate-400 text-sm"
          onClick={() => router.push("/dashboard")}
        >
          Go to Dashboard
        </button>
      </div>
    </main>
  );
}
