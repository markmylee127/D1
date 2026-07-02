"use client";
import { useState } from "react";

export default function UploadExamModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/exams/import", {
      method: "POST",
      body: form
    });

    setLoading(false);
    alert(res.ok ? "Uploaded!" : "Failed to upload.");
    if (res.ok) onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Import VCAA Exam (Private)</h2>

        <input
          type="file"
          accept="application/pdf"
          className="block w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div className="flex justify-end gap-2 text-sm">
          <button
            className="px-3 py-2 rounded-md border border-neutral-700 hover:bg-neutral-800"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            disabled={!file || loading}
            className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
            onClick={handleUpload}
          >
            {loading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
