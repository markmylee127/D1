"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");

    try {
      // Fake network request for now
      await new Promise((r) => setTimeout(r, 600));
      setEmail("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20" />
            <span className="font-semibold tracking-wide text-lg">
              D1 Education
            </span>
          </div>

          <nav className="flex gap-4 text-sm text-neutral-400">
            <Link href="/dashboard" className="hover:text-white transition">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 flex flex-col lg:flex-row gap-16 items-center">
        {/* Left Side – Hero Text */}
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400/70 mb-4">
            Precision • Mastery • Performance
          </p>

          <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] mb-6">
            Built for students who want to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              excel.
            </span>
          </h1>

          <p className="text-neutral-400 max-w-xl text-sm sm:text-base leading-relaxed mb-10">
            D1 Education is an elite learning system engineered for ambitious
            VCE students. Instant AI marking. Intelligent mistake analysis. And
            a spaced repetition engine grounded in real cognitive science.
          </p>

          {/* Waitlist Form */}
          <form
            onSubmit={handleJoin}
            className="flex flex-col sm:flex-row gap-3 mb-4"
          >
            <input
              type="email"
              required
              placeholder="Join the waitlist for early access"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 
                         placeholder-neutral-500 text-sm focus:outline-none 
                         focus:ring-1 focus:ring-blue-500/40"
            />

            <button
              type="submit"
              disabled={status === "loading"}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 
                         hover:opacity-90 transition text-sm disabled:opacity-50"
            >
              {status === "loading" ? "Joining..." : "Join waitlist"}
            </button>
          </form>

          {status === "success" && (
            <p className="text-xs text-emerald-400 mb-4">
              You&apos;re on the list. Welcome aboard.
            </p>
          )}
          {status === "error" && (
            <p className="text-xs text-red-400 mb-4">
              Something went wrong. Try again.
            </p>
          )}

          {/* Secondary Buttons */}
          <div className="flex flex-wrap gap-3 text-sm mt-6">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              Start Review
            </Link>
            <Link
              href="/mistakes"
              className="px-4 py-2 rounded-lg border border-neutral-700 hover:border-neutral-500 transition"
            >
              My Mistakes
            </Link>
            <Link
              href="/exams"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 
                         hover:opacity-90 transition"
            >
              Mock Exams
            </Link>
          </div>
        </div>

        {/* Right Side – Features */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
            <p className="text-blue-400/80 text-xs mb-1">AI MARKING</p>
            <h3 className="text-sm font-semibold mb-2">Instant feedback</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Upload your working. Receive immediate, examiner-level marking
              aligned with VCAA standards.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
            <p className="text-violet-400/80 text-xs mb-1">
              MISTAKE INTELLIGENCE
            </p>
            <h3 className="text-sm font-semibold mb-2">Never waste a mistake</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              D1 captures your errors, identifies weaknesses, and transforms
              them into targeted review cards.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
            <p className="text-blue-400/80 text-xs mb-1">D1 SPIRAL ENGINE</p>
            <h3 className="text-sm font-semibold mb-2">
              Adaptive spaced repetition
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Based on the Ebbinghaus Forgetting Curve — D1 surfaces each
              concept at the optimal time to maximise retention and performance.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
            <p className="text-violet-400/80 text-xs mb-1">
              ENGINEERED FOR PERFORMANCE
            </p>
            <h3 className="text-sm font-semibold mb-2">Built for ambition</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Designed for students aiming for top scores, competitive
              advantage, and long-term mastery.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-neutral-500 flex justify-between">
          <span>© {new Date().getFullYear()} D1 Education</span>
          <span className="hidden sm:inline">AI-powered mastery learning.</span>
        </div>
      </footer>
    </main>
  );
}
