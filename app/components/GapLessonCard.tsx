"use client";

type GapLessonProps = {
  name: string;
  explanation: string;
  imageUrl: string;
  miniQ: string;
  miniA: string;
};

export function GapLessonCard({
  name,
  explanation,
  imageUrl,
  miniQ,
  miniA,
}: GapLessonProps) {
  return (
    <div className="mt-4 rounded-xl border p-4 shadow-sm bg-white space-y-3">
      <h3 className="font-semibold text-lg">{name}</h3>

      <p className="text-sm text-gray-700">{explanation}</p>

      <div className="w-full flex justify-center">
        <img
          src={imageUrl}
          alt={name}
          className="max-h-64 object-contain rounded-md border"
        />
      </div>

      <div className="pt-2 border-t mt-2 space-y-1">
        <p className="text-sm font-medium">Quick check</p>
        <p className="text-sm">{miniQ}</p>

        {/* Temporary static answer. Later we will replace with input */}
        <p className="text-xs text-gray-500">
          <strong>Answer:</strong> {miniA}
        </p>
      </div>
    </div>
  );
}
