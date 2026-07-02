"use client";

import { useEffect, useState } from "react";

type Mistake = {
  id: string | number;
  subject: string | null;
  subtopic: string | null;
  question: string;
  concept_gap: string | null;
  correction: string | null;
  answer_image_url: string | null;
  created_at: string;
};

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState("");
  const [subtopicFilter, setSubtopicFilter] = useState("");

  const [selectedMistake, setSelectedMistake] = useState<Mistake | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/mistakes");
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load mistakes");
        }

        setMistakes(json.mistakes ?? []);
      } catch (err: any) {
        setError(err?.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = mistakes.filter((m) => {
    const subjectOk = subjectFilter
      ? m.subject?.toLowerCase().includes(subjectFilter.toLowerCase())
      : true;
    const subtopicOk = subtopicFilter
      ? m.subtopic?.toLowerCase().includes(subtopicFilter.toLowerCase())
      : true;
    return subjectOk && subtopicOk;
  });

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Mistake Bank</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Every question you got wrong, organised by subject and subtopic so you
          can attack your weakest concepts first.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
            placeholder="Filter by subject (e.g. Maths Methods)"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          />
          <input
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
            placeholder="Filter by subtopic (e.g. Transformations)"
            value={subtopicFilter}
            onChange={(e) => setSubtopicFilter(e.target.value)}
          />
        </div>

        {loading && <p className="text-sm text-zinc-400">Loading mistakes…</p>}
        {error && (
          <p className="text-sm text-red-400 mb-4">
            {error} — try refreshing the page.
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-zinc-400">
            No mistakes saved yet. Do some questions and submit them to AI
            marking — anything that isn’t 10/10 will appear here.
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900/80">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-300">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-300">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-300">
                    Subtopic
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-300">
                    Question
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-300">
                    Concept gap
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-300">
                    Correction
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer hover:bg-zinc-900/70 transition-colors"
                    onClick={() => setSelectedMistake(m)}
                  >
                    <td className="align-top px-4 py-3 text-zinc-400 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="align-top px-4 py-3">
                      {m.subject ?? "-"}
                    </td>
                    <td className="align-top px-4 py-3">
                      {m.subtopic ?? "-"}
                    </td>
                    <td className="align-top px-4 py-3 max-w-xs">
                      <div className="whitespace-pre-wrap text-zinc-100 line-clamp-4">
                        {m.question}
                      </div>
                    </td>
                    <td className="align-top px-4 py-3 max-w-xs">
                      <div className="whitespace-pre-wrap text-amber-200/90 line-clamp-4">
                        {m.concept_gap ?? "-"}
                      </div>
                    </td>
                    <td className="align-top px-4 py-3 max-w-xs">
                      <div className="whitespace-pre-wrap text-emerald-200/90 line-clamp-4">
                        {m.correction ?? "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedMistake && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setSelectedMistake(null)}
        >
          <div
            className="max-w-3xl w-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {selectedMistake.subject ?? "Mistake"}
                </h2>
                <p className="text-xs text-zinc-400">
                  {selectedMistake.subtopic && (
                    <>
                      <span className="font-medium">
                        {selectedMistake.subtopic}
                      </span>
                      {" • "}
                    </>
                  )}
                  {new Date(
                    selectedMistake.created_at
                  ).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedMistake(null)}
                className="text-zinc-400 hover:text-white text-sm px-3 py-1 rounded-full border border-zinc-700 hover:border-zinc-500"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {selectedMistake.answer_image_url && (
                <section>
                  <h3 className="text-zinc-300 font-medium mb-1">
                    Question / working image
                  </h3>
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedMistake.answer_image_url}
                      alt="Question / working"
                      className="max-h-[320px] w-auto rounded-lg object-contain"
                    />
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-zinc-300 font-medium mb-1">
                  Question
                </h3>
                <div className="whitespace-pre-wrap text-zinc-100 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2">
                  {selectedMistake.question}
                </div>
              </section>

              <section>
                <h3 className="text-amber-200 font-medium mb-1">
                  Concept gap (what you were missing)
                </h3>
                <div className="whitespace-pre-wrap text-amber-100/90 bg-amber-900/20 border border-amber-500/40 rounded-xl px-3 py-2">
                  {selectedMistake.concept_gap ??
                    "No gap analysis saved for this mistake."}
                </div>
              </section>

              <section>
                <h3 className="text-emerald-200 font-medium mb-1">
                  Correction / model solution
                </h3>
                <div className="whitespace-pre-wrap text-emerald-100/90 bg-emerald-900/20 border border-emerald-500/40 rounded-xl px-3 py-2">
                  {selectedMistake.correction ??
                    "No correction saved for this mistake."}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
