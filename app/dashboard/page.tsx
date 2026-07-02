"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

function RetentionCurve() {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const days = Array.from({ length: 31 }, (_, day) => ({
    day,
    retention: Math.round(100 * Math.exp(-day / 10)),
  }));

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
      <h2 className="text-2xl font-bold text-white">Your Forgetting Curve</h2>
      <p className="mt-2 text-slate-400">
        Hover over the graph to see your estimated retention.
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

export default function DashboardPage() {
  const [topics, setTopics] = useState<Topic[]>(() => {
    if (typeof window !== "undefined") {
      const savedTopics = localStorage.getItem("d1-topics");

      if (savedTopics) {
        return JSON.parse(savedTopics);
      }
    }

    return [
      { id: "methods", name: "Methods", problemSets: [] },
      { id: "specialist", name: "Specialist", problemSets: [] },
      { id: "chemistry", name: "Chemistry", problemSets: [] },
    ];
  });

  const [activeTopic, setActiveTopic] = useState("methods");
  const [newTopicName, setNewTopicName] = useState("");
  const [title, setTitle] = useState("");
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [selectedProblemSet, setSelectedProblemSet] =
    useState<ProblemSet | null>(null);

  useEffect(() => {
    localStorage.setItem("d1-topics", JSON.stringify(topics));
  }, [topics]);

  const currentTopic = topics.find((topic) => topic.id === activeTopic);

  function addTopic() {
    if (!newTopicName.trim()) return;

    const newTopic: Topic = {
      id: crypto.randomUUID(),
      name: newTopicName.trim(),
      problemSets: [],
    };

    setTopics([...topics, newTopic]);
    setActiveTopic(newTopic.id);
    setNewTopicName("");
  }

  function deleteTopic(topicId: string) {
    const remainingTopics = topics.filter((topic) => topic.id !== topicId);

    setTopics(remainingTopics);

    if (activeTopic === topicId) {
      setActiveTopic(remainingTopics[0]?.id || "");
    }
  }

  function addFiles(files: FileList | null, type: "questions" | "answers") {
    if (!files) return;

    const acceptedFiles = Array.from(files).filter(
      (file) => file.type.startsWith("image/") || file.type === "application/pdf"
    );

    if (type === "questions") {
      setQuestionFiles((prev) => [...prev, ...acceptedFiles]);
    } else {
      setAnswerFiles((prev) => [...prev, ...acceptedFiles]);
    }
  }

  function saveProblemSet() {
    if (!currentTopic) return;
    if (questionFiles.length === 0 && answerFiles.length === 0) return;

    const newProblemSet: ProblemSet = {
      id: crypto.randomUUID(),
      title: title.trim() || "Untitled Problem Set",
      questionFiles: questionFiles.map((file) => ({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
      })),
      answerFiles: answerFiles.map((file) => ({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
      })),
    };

    setTopics((current) =>
      current.map((topic) =>
        topic.id === activeTopic
          ? { ...topic, problemSets: [newProblemSet, ...topic.problemSets] }
          : topic
      )
    );

    setTitle("");
    setQuestionFiles([]);
    setAnswerFiles([]);
  }

  function deleteProblemSet(problemSetId: string) {
    setTopics((current) =>
      current.map((topic) =>
        topic.id === activeTopic
          ? {
              ...topic,
              problemSets: topic.problemSets.filter(
                (problemSet) => problemSet.id !== problemSetId
              ),
            }
          : topic
      )
    );

    setSelectedProblemSet(null);
  }

  function UploadBox({
    label,
    type,
    files,
    color,
  }: {
    label: string;
    type: "questions" | "answers";
    files: File[];
    color: "violet" | "emerald";
  }) {
    return (
      <label
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addFiles(e.dataTransfer.files, type);
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed ${
          color === "violet"
            ? "border-violet-400/70 hover:border-violet-300"
            : "border-emerald-400/70 hover:border-emerald-300"
        } bg-slate-950/70 p-8 text-center`}
      >
        <p className="font-bold text-slate-200">{label}</p>
        <p className="mt-4 text-slate-400">Drag & drop or click</p>

        <input
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => addFiles(e.target.files, type)}
        />

        <p
          className={`mt-3 text-sm ${
            color === "violet" ? "text-violet-300" : "text-emerald-300"
          }`}
        >
          {files.length} file(s) selected
        </p>
      </label>
    );
  }

  function FilePreview({ file }: { file: SavedFile }) {
    if (file.type === "application/pdf") {
      return (
        <a
          href={file.url}
          target="_blank"
          className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-200 hover:bg-slate-800"
        >
          📄 {file.name}
        </a>
      );
    }

    return (
      <img
        src={file.url}
        alt={file.name}
        className="w-full rounded-2xl border border-slate-800"
      />
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl space-y-10">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Strengthen your understanding
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Your Consolidator Dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Upload problem sets, organise them by topic, and let D1 turn weak
            concepts into future revision.
          </p>

          <div className="mt-6 flex gap-4">
            <Link
              href="/consolidators"
              className="rounded-2xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-600"
            >
              AI Consolidators →
            </Link>
          </div>
        </header>

        <RetentionCurve />

        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-xl">
          <h2 className="text-2xl font-bold">Topics</h2>

          <div className="mt-5 flex flex-wrap gap-3">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className={`flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold ${
                  activeTopic === topic.id
                    ? "bg-violet-500 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                <button onClick={() => setActiveTopic(topic.id)}>
                  {topic.name}
                  <span className="ml-2 text-sm opacity-70">
                    {topic.problemSets.length}
                  </span>
                </button>

                <button
                  onClick={() => deleteTopic(topic.id)}
                  className="rounded-full px-2 text-sm opacity-70 hover:bg-black/20 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Create custom topic e.g. Trigonometry"
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
            />

            <button
              onClick={addTopic}
              className="rounded-2xl bg-white px-6 py-4 font-semibold text-black hover:bg-slate-200"
            >
              + Add Topic
            </button>
          </div>
        </section>

        {currentTopic && (
          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-xl">
            <h2 className="text-2xl font-bold">
              Add Problem Set to {currentTopic.name}
            </h2>

            <div className="mt-8 rounded-3xl border border-violet-500/50 bg-violet-950/20 p-6">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title optional"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-lg text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
              />

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <UploadBox
                  label="📋 Questions"
                  type="questions"
                  files={questionFiles}
                  color="violet"
                />

                <UploadBox
                  label="✅ Answers"
                  type="answers"
                  files={answerFiles}
                  color="emerald"
                />
              </div>

              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={() => {
                    setTitle("");
                    setQuestionFiles([]);
                    setAnswerFiles([]);
                  }}
                  className="px-5 py-3 font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={saveProblemSet}
                  className="rounded-2xl bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-600"
                >
                  + Save
                </button>
              </div>
            </div>

            {currentTopic.problemSets.length > 0 && (
              <div className="mt-8 space-y-3">
                <h3 className="text-lg font-semibold">Saved Problem Sets</h3>

                {currentTopic.problemSets.map((problemSet) => (
                  <div
                    key={problemSet.id}
                    onClick={() => setSelectedProblemSet(problemSet)}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800 bg-black/30 p-5 hover:bg-slate-900/80"
                  >
                    <div>
                      <p className="font-bold">{problemSet.title}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {problemSet.questionFiles.length} question file(s),{" "}
                        {problemSet.answerFiles.length} answer file(s)
                      </p>
                      <p className="mt-1 text-xs text-violet-300">
                        Click to view
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProblemSet(problemSet.id);
                      }}
                      className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      {selectedProblemSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-3xl font-bold">
                {selectedProblemSet.title}
              </h2>

              <button
                onClick={() => setSelectedProblemSet(null)}
                className="rounded-xl border border-slate-700 px-5 py-3 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <h3 className="mb-4 text-xl font-bold">Questions</h3>
            <div className="mb-10 grid gap-5 md:grid-cols-2">
              {selectedProblemSet.questionFiles.length === 0 ? (
                <p className="text-slate-400">No question files uploaded.</p>
              ) : (
                selectedProblemSet.questionFiles.map((file, index) => (
                  <FilePreview key={index} file={file} />
                ))
              )}
            </div>

            <h3 className="mb-4 text-xl font-bold">Answers</h3>
            <div className="grid gap-5 md:grid-cols-2">
              {selectedProblemSet.answerFiles.length === 0 ? (
                <p className="text-slate-400">No answer files uploaded.</p>
              ) : (
                selectedProblemSet.answerFiles.map((file, index) => (
                  <FilePreview key={index} file={file} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}