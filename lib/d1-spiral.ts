// lib/d1-spiral.ts

export type Rating = "again" | "unsure" | "easy";

export type D1State = {
  stability: number | null;      // S in days, null means "new card"
  lastReviewedAt: Date | null;   // last review timestamp
  timesSeen: number;             // how many times reviewed (or attempted)
};

export type D1UpdateInput = D1State & {
  rating: Rating;
  now: Date;
  examDate?: Date;               // optional – if you want exam-aware clamping
};

export type D1UpdateOutput = {
  stability: number;             // updated S
  timesSeen: number;             // updated timesSeen
  lastReviewedAt: Date;          // now
  intervalDays: number;          // t_next
  dueDate: Date;                 // now + intervalDays
  rating: Rating;                // store last rating too
};

// Helper: compute retrievability R = exp(-t / S)
export function retrievabilityAt(
  stability: number,
  lastReviewedAt: Date,
  now: Date
): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const tDays = (now.getTime() - lastReviewedAt.getTime()) / msPerDay;
  if (tDays <= 0) return 1;
  return Math.exp(-tDays / stability);
}

// Main update function: given current state + rating → new schedule
export function updateD1Schedule(input: D1UpdateInput): D1UpdateOutput {
  const {
    stability: S_in,
    lastReviewedAt,
    timesSeen,
    rating,
    now,
    examDate,
  } = input;

  // 1. Initialise stability for brand new cards
  let S = S_in ?? 1.5; // starting stability in days (tweakable)
  let seen = timesSeen ?? 0;

  // 2. Update Stability based on rating
  // These are heuristics: tune later once you see behaviour.
  if (rating === "again") {
    // Collapse stability – we basically " relearn " it
    S = Math.max(0.7, S * 0.5); // lower bound so it doesn't go to 0
  } else if (rating === "unsure") {
    // Small boost – you kind of remember it
    S = S * 1.1 + 0.2;
  } else if (rating === "easy") {
    // Larger boost – memory gets more solid
    S = S * 1.4 + 0.5;
  }

  // Clamp stability to a sane range for VCE
  const MIN_S = 0.7;   // ~same-day reviews minimum
  const MAX_S = 90;    // don't go too insane even if seen many times
  S = Math.min(MAX_S, Math.max(MIN_S, S));

  // 3. Choose target retrievability for next due
  // Higher R_target = sooner review
  let R_target: number;
  if (rating === "again") {
    R_target = 0.8;   // we want to see it again while it's still fresh
  } else if (rating === "unsure") {
    R_target = 0.5;   // medium spacing
  } else {
    // easy
    R_target = 0.3;   // we can push this card further into the future
  }

  // 4. Compute next interval using R(t) = exp(-t/S)
  // R_target = exp(-t/S) → t = -S * ln(R_target)
  const intervalDaysRaw = -S * Math.log(R_target);

  // 5. Exam-aware + safety clamps
  let intervalDays = intervalDaysRaw;

  // Ensure at least half-day, and not crazy huge
  const ABS_MIN_INTERVAL = 0.5; // 12 hours
  const ABS_MAX_INTERVAL = 60;  // 60 days hard cap

  intervalDays = Math.max(ABS_MIN_INTERVAL, intervalDays);
  intervalDays = Math.min(ABS_MAX_INTERVAL, intervalDays);

  // If we know the exam date, avoid sending reviews too far away
  if (examDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysToExam = (examDate.getTime() - now.getTime()) / msPerDay;

    if (daysToExam > 0) {
      const maxExamInterval = Math.max(1, daysToExam / 2); // ≤ half time to exam
      intervalDays = Math.min(intervalDays, maxExamInterval);
    }
  }

  // 6. Compute due date
  const msPerDay = 1000 * 60 * 60 * 24;
  const dueDate = new Date(now.getTime() + intervalDays * msPerDay);

  return {
    stability: S,
    timesSeen: seen + 1,
    lastReviewedAt: now,
    intervalDays,
    dueDate,
    rating,
  };
}
