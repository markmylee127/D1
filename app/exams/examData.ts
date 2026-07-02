// app/exams/examData.ts

export type ExamQuestion = {
  id: string;
  prompt: string;
};

export type Exam = {
  title: string;
  description: string;
  questions: ExamQuestion[];
};

// Record<string, Exam> so exams[slug] is allowed
export const exams: Record<string, Exam> = {
  "methods-mock1": {
    title: "Methods Mock Exam 1",
    description: "Non-calculator practice exam modeled on VCAA Exam 1.",
    questions: [
      {
        id: "q1",
        prompt: "Differentiate: f(x) = 3x^4 - 5x + 7",
      },
      {
        id: "q2",
        prompt: "Solve the equation: e^(2x) = 7",
      },
      {
        id: "q3",
        prompt: "The graph of y = g(x) is shown. Sketch y = g(x+2).",
      },
    ],
  },
  
  "methods-mock2": {
    title: "Methods Mock Exam 2",
    description: "Calculator exam modeled on VCAA Exam 2.",
    questions: [
      {
        id: "q1",
        prompt: "Find the area under y = x^2 from x = 0 to x = 3.",
      },
      {
        id: "q2",
        prompt: "A function is defined as f(x) = 3^x. Solve f(x) = 25.",
      },
    ],
  },

  // Add Specialist + Chemistry exams here later
};
