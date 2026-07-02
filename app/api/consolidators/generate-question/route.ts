import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

type GeneratedQuestion = {
  question: string;
  source_title: string;
  source_url: string;
  source_note: string;
};

const SOURCE_PAGES = {
  methods: {
    title: "VCAA Mathematical Methods past examinations and examination reports",
    url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/mathematical-methods",
  },
  specialist: {
    title: "VCAA Specialist Mathematics past examinations and examination reports",
    url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/specialist-mathematics",
  },
  chemistry: {
    title: "VCAA Chemistry past examinations and examination reports",
    url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/chemistry",
  },
};

function extractOutputText(response: unknown): string | null {
  if (!response || typeof response !== "object" || !("output" in response)) {
    return null;
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;

    if (
      "type" in item &&
      item.type === "output_text" &&
      "output_text" in item &&
      item.output_text &&
      typeof item.output_text === "object" &&
      "text" in item.output_text &&
      typeof item.output_text.text === "string"
    ) {
      return item.output_text.text;
    }

    if ("content" in item && Array.isArray(item.content)) {
      for (const content of item.content) {
        if (!content || typeof content !== "object") continue;

        if ("text" in content && typeof content.text === "string") {
          return content.text;
        }

        if (
          "output_text" in content &&
          content.output_text &&
          typeof content.output_text === "object" &&
          "text" in content.output_text &&
          typeof content.output_text.text === "string"
        ) {
          return content.output_text.text;
        }
      }
    }
  }

  return null;
}

function getSource(subject: string) {
  const normalized = subject.toLowerCase();

  if (normalized.includes("specialist")) return SOURCE_PAGES.specialist;
  if (normalized.includes("chemistry")) return SOURCE_PAGES.chemistry;

  return SOURCE_PAGES.methods;
}

function formatFractions(text: string) {
  const unicodeFractions: Record<string, string> = {
    "1/2": "½",
    "1/3": "⅓",
    "2/3": "⅔",
    "1/4": "¼",
    "3/4": "¾",
    "1/5": "⅕",
    "2/5": "⅖",
    "3/5": "⅗",
    "4/5": "⅘",
    "1/6": "⅙",
    "5/6": "⅚",
    "1/8": "⅛",
    "3/8": "⅜",
    "5/8": "⅝",
    "7/8": "⅞",
  };

  return text.replace(
    /(?<![\w)])(\d+)\/(\d+)(?![\w(])/g,
    (match: string, numerator: string, denominator: string) => {
      const unicode = unicodeFractions[match];

      if (unicode) {
        return unicode;
      }

      return `(${numerator})/(${denominator})`;
    }
  );
}

function parseGeneratedQuestion(raw: string, fallbackSource: typeof SOURCE_PAGES.methods) {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(cleaned) as Partial<GeneratedQuestion>;

  if (!parsed.question || !parsed.question.trim()) {
    throw new Error("AI response did not include a question.");
  }

  return {
    question: formatFractions(parsed.question.trim()),
    source_title: parsed.source_title?.trim() || fallbackSource.title,
    source_url: parsed.source_url?.trim() || fallbackSource.url,
    source_note:
      parsed.source_note?.trim() ||
      "Original AI-generated practice question based on VCAA past-exam style; not copied from an exam.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subject =
      typeof body?.subject === "string" && body.subject.trim()
        ? body.subject.trim()
        : "Mathematical Methods";
    const subtopic =
      typeof body?.subtopic === "string" && body.subtopic.trim()
        ? body.subtopic.trim()
        : "Mixed revision";
    const source = getSource(subject);

    const prompt = `
You are a VCE exam-question writer for D1 Education.

Create ONE original practice question for:
Subject: ${subject}
Subtopic: ${subtopic}

Use the official VCAA past-exam page below as the style/source reference:
${source.title}
${source.url}

Rules:
- Do not copy or closely paraphrase a VCAA question.
- Generate an original VCE-style question inspired by the source page and the selected subtopic.
- Use proper student-facing mathematical notation in plain text.
- Prefer Unicode mathematical symbols where they improve readability:
  - powers: x², x³, eˣ, not x^2 unless the exponent is complex
  - roots: √x, √(x² + 1), not sqrt(x)
  - fractions: use Unicode fraction glyphs for common simple fractions such as ½, ⅓, ⅔, ¼, ¾, ⅕, ⅖, ⅗, ⅘
  - algebraic fractions: write numerator and denominator with clear brackets, for example (x² + 1)/(x - 3), not x² + 1/x - 3
  - fractional coefficients: write ½x², ⅔π, ¾eˣ where appropriate
  - calculus: dy/dx, d²y/dx², ∫, definite integrals like ∫₀² f(x) dx
  - probability: P(X ≥ 2), X ~ Bin(12, 0.35), E(X), Var(X)
  - functions: f: R → R, f(x) = ..., domain x ∈ R, x ≠ 0
  - trigonometry: sin(x), cos(2x), tan⁻¹(x), π/3
  - vectors: 2i - j + 3k, |a|, a · b, a × b
  - intervals: [0, 4], (-∞, 3), x ∈ [0, 2π]
- Use line breaks for multi-part questions, labelled a., b., c.
- Do not output programming syntax such as Math.pow, sqrt(), <=, >=, !=, or **.
- Use ≤, ≥, ≠, ±, ∞, θ, α, β where appropriate.
- Do not use LaTeX delimiters, markdown tables, solutions, hints, or marking guides.
- If a diagram would normally be needed, describe the diagram precisely in text so the student can solve it.
- Include enough information for the student to answer without seeing the source exam.
- Cite the source page in the returned JSON.

Return ONLY valid JSON in this exact shape:
{
  "question": "string",
  "source_title": "${source.title}",
  "source_url": "${source.url}",
  "source_note": "Original AI-generated practice question based on VCAA past-exam style; not copied from an exam."
}
`.trim();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = extractOutputText(response);
    if (!raw) {
      return NextResponse.json(
        { error: "Failed to generate question" },
        { status: 500 }
      );
    }

    return NextResponse.json(parseGeneratedQuestion(raw, source));
  } catch (err) {
    console.error("GENERATE CONSOLIDATOR QUESTION ERROR:", err);
    return NextResponse.json(
      { error: "Failed to generate question" },
      { status: 500 }
    );
  }
}
