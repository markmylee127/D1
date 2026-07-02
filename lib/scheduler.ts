export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

type State = {
  ease: number;          // ~2.5 baseline
  intervalDays: number;  // current interval
  reps: number;          // consecutive successes
};

export function scheduleNext(state: State, grade: Grade) {
  let { ease, intervalDays, reps } = state;

  if (grade < 3) {
    // reset on fail
    reps = 0;
    intervalDays = 1;
  } else {
    // success
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * ease));
  }

  // SM-2 ease adjustment
  ease = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  ease = Math.max(1.3, Math.min(3.0, ease)); // clamp

  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + intervalDays);

  return { ease, intervalDays, reps, nextDue };
}