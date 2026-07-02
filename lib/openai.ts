// lib/openai.ts
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in env");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Shape of what we expect back from the grader
export type GradingResult = {
  score: number; // 0-10
  feedback: string;
};
