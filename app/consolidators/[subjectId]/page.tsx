"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type SavedFile = {
  name: string;
  url: string;
  type: string;
};

type ProblemSet = {
  id: string;
  title: string;
  questionFiles: SavedFile[];
  answerFiles: SavedFile[];
};

type Topic = {
  id: string;
  name: string;
  problemSets: ProblemSet[];
};

type AiResponse = {
  feedback?: string | null;
  gap_explanation?: string | null;
  model_solution?: string | null;
};

type GeneratedQuestion = {
  question: string;
  source_title: string;
  source_url: string;
  source_note: string;
};

type ConsolidatorQuestion =
  | {
      kind: "file";
      file: SavedFile;
    }
  | {
      kind: "generated";
      generated: GeneratedQuestion;
    };

const SUBJECT_SUBTOPICS: Record<string, string[]> = {
  methods: [
    "Functions",
    "Differentiation",
    "Trigonometry",
    "Integration",
    "Probability",
  ],
  specialist: [
    "Vectors",
    "Complex Numbers",
    "Differential Equations",
    "Mechanics",
    "Probability",
  ],
  chemistry: [
    "Stoichiometry",
    "Equilibrium",
    "Organic Chemistry",
    "Acids and Bases",
    "Electrochemistry",
  ],
};

function buildCurve(seed: number) {
  const decay = 8 + (seed % 5) * 2;

  return Array.from({ length: 31 }, (_, day) => ({
    day,
    retention: Math.round(100 * Math.exp(-day / decay)),
  }));
}

function getSubtopics(topic: Topic) {
  const normalizedId = topic.id.toLowerCase();
  const normalizedName = topic.name.toLowerCase();
  const knownSubject = Object.entries(SUBJECT_SUBTOPICS).find(
    ([key]) => normalizedId.includes(key) || normalizedName.includes(key)
  );

  if (knownSubject) {
    return knownSubject[1];
  }

  if (topic.problemSets.length > 0) {
    return topic.problemSets.map((problemSet) => problemSet.title);
  }

  return [
    "Core Concepts",
    "Application Questions",
    "Exam Technique",
    "Error Correction",
    "Mixed Revision",
  ];
}

function RetentionCurve({
  title,
  seed,
}: {
  title: string;
  seed: number;
}) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const days = buildCurve(seed);
  const selected = hoveredDay === null ? null : days[hoveredDay];

  const points = days
    .map((point) => {
      const x = 60 + point.day * 26.6;
      const y = 280 - point.retention * 2.4;
      return `${x},${y}`;
    })
    .join(" ");

  function handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const scaledX = (mouseX / rect.width) * 900;
    const day = Math.round((scaledX - 60) / 26.6);

    setHoveredDay(Math.max(0, Math.min(30, day)));
  }

  const selectedX = selected ? 60 + selected.day * 26.6 : 0;
  const selectedY = selected ? 280 - selected.retention * 2.4 : 0;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-xl">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-slate-400">
        Hover over the graph to see the estimated retention for this subject.
      </p>

      <div className="mt-8 overflow-x-auto">
        <svg
          viewBox="0 0 900 330"
          className="min-w-[850px] cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredDay(null)}
        >
          {[0, 25, 50, 75, 100].map((value) => {
            const y = 280 - value * 2.4;

            return (
              <g key={value}>
                <line
                  x1="60"
                  x2="860"
                  y1={y}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="6 6"
                />
                <text x="10" y={y + 5} fontSize="14" fill="#94a3b8">
                  {value}%
                </text>
              </g>
            );
          })}

          <line
            x1="60"
            x2="860"
            y1="160"
            y2="160"
            stroke="#fb7185"
            strokeDasharray="6 6"
          />

          <polyline
            fill="rgba(139, 92, 246, 0.18)"
            stroke="none"
            points={`60,280 ${points} 858,280`}
          />

          <polyline
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="4"
            points={points}
          />

          {days
            .filter((_, index) => index % 2 === 0)
            .map((point) => {
              const x = 60 + point.day * 26.6;

              return (
                <text
                  key={point.day}
                  x={x - 4}
                  y="310"
                  fontSize="13"
                  fill="#94a3b8"
                >
                  {point.day}
                </text>
              );
            })}

          {selected && (
            <>
              <line
                x1={selectedX}
                x2={selectedX}
                y1="40"
                y2="280"
                stroke="#64748b"
              />
              <circle
                cx={selectedX}
                cy={selectedY}
                r="7"
                fill="#8b5cf6"
                stroke="white"
                strokeWidth="3"
              />

              <rect
                x={selectedX > 700 ? selectedX - 180 : selectedX + 18}
                y={selectedY > 160 ? selectedY - 95 : selectedY + 20}
                width="160"
                height="85"
                rx="16"
                fill="#020617"
                stroke="#334155"
              />

              <text
                x={selectedX > 700 ? selectedX - 155 : selectedX + 40}
                y={selectedY > 160 ? selectedY - 60 : selectedY + 55}
                fontSize="18"
                fontWeight="700"
                fill="white"
              >
                Day {selected.day}
              </text>

              <text
                x={selectedX > 700 ? selectedX - 155 : selectedX + 40}
                y={selectedY > 160 ? selectedY - 28 : selectedY + 87}
                fontSize="18"
                fill="#a78bfa"
              >
                Retention: {selected.retention}%
              </text>
            </>
          )}
        </svg>
      </div>
    </section>
  );
}

function SubtopicSection({
  name,
  index,
  uploadedSet,
  onGenerate,
  generating,
}: {
  name: string;
  index: number;
  uploadedSet?: ProblemSet;
  onGenerate: () => void;
  generating: boolean;
}) {
  const retention = buildCurve(index + 1)[Math.min(14, 30)].retention;
  const questionCount = uploadedSet?.questionFiles.length ?? 0;
  const status =
    retention >= 55 ? "Stable" : retention >= 35 ? "Due soon" : "Needs review";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Subtopic
          </p>
          <h3 className="mt-2 text-xl font-bold text-white">{name}</h3>
        </div>
        <p className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-violet-300">
          {retention}%
        </p>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-violet-500"
          style={{ width: `${retention}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
          {status}
        </span>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
          {questionCount} uploaded question{questionCount === 1 ? "" : "s"}
        </span>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="mt-5 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generating ? "Generating..." : `Generate ${name} Consolidator`}
      </button>
    </section>
  );
}

export default function SubjectConsolidatorPage() {
  const params = useParams<{ subjectId: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [selectedQuestion, setSelectedQuestion] =
    useState<ConsolidatorQuestion | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerImageFile, setAnswerImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingSubtopic, setGeneratingSubtopic] = useState<string | null>(
    null
  );
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [gapExplanation, setGapExplanation] = useState<string | null>(null);
  const [modelSolution, setModelSolution] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const subtopics = topic ? getSubtopics(topic) : [];

  useEffect(() => {
    const saved = localStorage.getItem("d1-topics");

    if (!saved) return;

    const topics: Topic[] = JSON.parse(saved);
    const subjectId = decodeURIComponent(params.subjectId);

    setTopic(topics.find((candidate) => candidate.id === subjectId) ?? null);
  }, [params.subjectId]);

  function resetAnswer() {
    setAnswerText("");
    setAnswerImageFile(null);
    setAiFeedback(null);
    setGapExplanation(null);
    setModelSolution(null);
    setError(null);
  }

  async function generateAiQuestion(subtopicName?: string) {
    if (!topic) return;

    const focus = subtopicName ?? "Mixed revision";
    setGeneratingSubtopic(focus);
    setError(null);
    resetAnswer();

    try {
      const response = await fetch("/api/consolidators/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: topic.name,
          subtopic: focus,
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || "Failed to generate question");
      }

      const generated: GeneratedQuestion = await response.json();
      setSelectedQuestion({ kind: "generated", generated });
      setSelectedSubtopic(subtopicName ?? null);
    } catch (err: unknown) {
      setSelectedQuestion(null);
      setSelectedSubtopic(subtopicName ?? null);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating a question."
      );
    } finally {
      setGeneratingSubtopic(null);
    }
  }

  async function generateConsolidator(
    subtopicName?: string,
    subtopicIndex?: number
  ) {
    if (!topic) return;

    const matchingProblemSet = subtopicName
      ? topic.problemSets.find((problemSet) =>
          problemSet.title.toLowerCase().includes(subtopicName.toLowerCase())
        )
      : null;

    const subtopicQuestions =
      matchingProblemSet?.questionFiles ??
      (typeof subtopicIndex === "number"
        ? topic.problemSets[subtopicIndex]?.questionFiles ?? []
        : []);

    const allQuestions =
      subtopicQuestions.length > 0
        ? subtopicQuestions
        : topic.problemSets.flatMap((problemSet) => problemSet.questionFiles);

    if (
      (subtopicName && subtopicQuestions.length === 0) ||
      allQuestions.length === 0
    ) {
      await generateAiQuestion(subtopicName);
      return;
    }

    const randomQuestion =
      allQuestions[Math.floor(Math.random() * allQuestions.length)];

    setSelectedQuestion({ kind: "file", file: randomQuestion });
    setSelectedSubtopic(subtopicName ?? null);
    resetAnswer();
  }

  async function getQuestionImageFile() {
    if (
      !selectedQuestion ||
      selectedQuestion.kind !== "file" ||
      !selectedQuestion.file.type.startsWith("image/")
    ) {
      return null;
    }

    try {
      const response = await fetch(selectedQuestion.file.url);
      const blob = await response.blob();
      return new File([blob], selectedQuestion.file.name, {
        type: selectedQuestion.file.type || blob.type || "image/png",
      });
    } catch {
      return null;
    }
  }

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();

    if (!selectedQuestion || (!answerText.trim() && !answerImageFile)) {
      setError("Type an answer or upload a picture of your working.");
      return;
    }

    setLoading(true);
    setError(null);
    setAiFeedback(null);
    setGapExplanation(null);
    setModelSolution(null);

    try {
      const formData = new FormData();
      formData.append(
        "question",
        selectedQuestion.kind === "generated"
          ? [
              selectedQuestion.generated.question,
              selectedSubtopic ? `Subtopic focus: ${selectedSubtopic}` : null,
              `Source: ${selectedQuestion.generated.source_title}`,
              selectedQuestion.generated.source_url,
            ]
              .filter(Boolean)
              .join("\n\n")
          : [
              `Consolidator question selected from uploaded file: ${selectedQuestion.file.name}`,
              selectedSubtopic ? `Subtopic focus: ${selectedSubtopic}` : null,
            ]
              .filter(Boolean)
              .join("\n")
      );

      if (answerText.trim()) {
        formData.append("answer", answerText.trim());
      }

      const questionImageFile = await getQuestionImageFile();
      if (questionImageFile) {
        formData.append("question_image", questionImageFile);
      }

      if (answerImageFile) {
        formData.append("answer_image", answerImageFile);
      }

      const response = await fetch("/api/ai-mark", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || "Failed to submit answer");
      }

      const json: AiResponse = await response.json();
      setAiFeedback(json.feedback ?? null);
      setGapExplanation(json.gap_explanation ?? null);
      setModelSolution(json.model_solution ?? null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl space-y-10">
        <header>
          <Link
            href="/consolidators"
            className="text-sm text-violet-300 hover:text-violet-200"
          >
            Back to AI Consolidators
          </Link>

          <p className="mt-8 text-xs uppercase tracking-[0.35em] text-slate-500">
            Subject Consolidator
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {topic ? topic.name : "Subject"}
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Review retention by subtopic, then generate a consolidator question
            from this subject.
          </p>
        </header>

        {!topic ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8">
            <h2 className="text-2xl font-bold">Subject not found</h2>
            <p className="mt-4 text-slate-400">
              This subject is not in your saved dashboard topics.
            </p>
          </section>
        ) : (
          <>
            <RetentionCurve
              title={`${topic.name} Forgetting Curve`}
              seed={topic.problemSets.length + topic.name.length}
            />

            <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Subtopics</h2>
                  <p className="mt-2 text-slate-400">
                    Track retention across the main areas in {topic.name}.
                  </p>
                </div>

                <button
                  onClick={() => generateConsolidator()}
                  disabled={generatingSubtopic !== null}
                  className="rounded-2xl bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-600"
                >
                  {generatingSubtopic === "Mixed revision"
                    ? "Generating..."
                    : "Generate Subject Consolidator"}
                </button>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {subtopics.map((subtopic, index) => (
                  <SubtopicSection
                    key={subtopic}
                    name={subtopic}
                    index={index}
                    uploadedSet={topic.problemSets[index]}
                    onGenerate={() => generateConsolidator(subtopic, index)}
                    generating={generatingSubtopic === subtopic}
                  />
                ))}
              </div>
            </section>

            {selectedQuestion && (
              <section className="rounded-3xl border border-violet-500/40 bg-violet-950/20 p-8">
                <h2 className="text-2xl font-bold">Consolidator Question</h2>

                <p className="mt-3 text-slate-400">
                  This is selected from{" "}
                  {selectedSubtopic ? `${topic.name} · ${selectedSubtopic}` : topic.name}.
                </p>

                {selectedQuestion.kind === "generated" ? (
                  <div className="mt-8 rounded-3xl border border-slate-800 bg-black/40 p-6">
                    <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-100">
                      {selectedQuestion.generated.question}
                    </p>
                    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                      <p className="font-semibold text-slate-100">Source</p>
                      <a
                        href={selectedQuestion.generated.source_url}
                        target="_blank"
                        className="mt-2 block text-violet-300 underline"
                      >
                        {selectedQuestion.generated.source_title}
                      </a>
                      <p className="mt-2 text-slate-400">
                        {selectedQuestion.generated.source_note}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 rounded-3xl border border-slate-800 bg-black/40 p-5">
                    {selectedQuestion.file.type === "application/pdf" ? (
                      <a
                        href={selectedQuestion.file.url}
                        target="_blank"
                        className="text-violet-300 underline"
                      >
                        Open PDF question
                      </a>
                    ) : (
                      <img
                        src={selectedQuestion.file.url}
                        alt={selectedQuestion.file.name}
                        className="w-full rounded-2xl border border-slate-800"
                      />
                    )}
                  </div>
                )}

                <form onSubmit={submitAnswer} className="mt-8 space-y-5">
                  <textarea
                    value={answerText}
                    onChange={(event) => setAnswerText(event.target.value)}
                    placeholder="Student answer..."
                    className="min-h-40 w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white outline-none focus:border-violet-400"
                  />

                  <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-emerald-400/70 bg-slate-950/70 p-6 text-center hover:border-emerald-300">
                    <p className="font-bold text-slate-200">
                      Upload a picture of your answer
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Photos or screenshots of handwritten working are accepted.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        setAnswerImageFile(event.target.files?.[0] ?? null)
                      }
                    />
                    <p className="mt-3 text-sm text-emerald-300">
                      {answerImageFile
                        ? answerImageFile.name
                        : "No image selected"}
                    </p>
                  </label>

                  {error && (
                    <p className="rounded-2xl border border-red-500/40 bg-red-950/30 px-5 py-3 text-sm text-red-200">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4">
                    <button
                      type="submit"
                      disabled={
                        loading || (!answerText.trim() && !answerImageFile)
                      }
                      className="rounded-2xl bg-white px-6 py-3 font-semibold text-black hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Submitting..." : "Submit Answer"}
                    </button>

                    <button
                      type="button"
                      onClick={resetAnswer}
                      disabled={loading}
                      className="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                    >
                      Clear
                    </button>
                  </div>
                </form>

                {(aiFeedback || gapExplanation || modelSolution) && (
                  <div className="mt-8 grid gap-5 lg:grid-cols-3">
                    {aiFeedback && (
                      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                          Feedback
                        </h3>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                          {aiFeedback}
                        </p>
                      </section>
                    )}

                    {gapExplanation && (
                      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                          Gap
                        </h3>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                          {gapExplanation}
                        </p>
                      </section>
                    )}

                    {modelSolution && (
                      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                          Model Solution
                        </h3>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                          {modelSolution}
                        </p>
                      </section>
                    )}
                  </div>
                )}
              </section>
            )}

            {error && !selectedQuestion && (
              <p className="rounded-2xl border border-red-500/40 bg-red-950/30 px-5 py-3 text-sm text-red-200">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
