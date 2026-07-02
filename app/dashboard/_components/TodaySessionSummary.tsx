type TodaySessionSummaryProps = {
  numDue: number;
  totalAttempts: number;
  loading?: boolean;
  onStartSession: () => void;
};

export function TodaySessionSummary({
  numDue,
  totalAttempts,
  loading = false,
  onStartSession,
}: TodaySessionSummaryProps) {
  // ---------- Loading state ----------
  if (loading) {
    return (
      <section className="w-full mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white/70 shadow-sm p-5 animate-pulse">
          <div className="h-5 w-32 mb-3 rounded bg-gray-200" />
          <div className="h-4 w-56 mb-2 rounded bg-gray-200" />
          <div className="h-10 w-40 mt-4 rounded bg-gray-200" />
        </div>
      </section>
    );
  }

  // ---------- Text variants ----------
  const hasDue = numDue > 0;
  const hasHistory = totalAttempts > 0;

  let title = "Today’s Session";
  let subtitle = "";
  let buttonLabel = "Start Session";

  if (hasDue) {
    title = "Today’s Review";
    subtitle = `You have ${numDue} card${numDue === 1 ? "" : "s"} due based on your forgetting curve.`;
    buttonLabel = `Review ${numDue} card${numDue === 1 ? "" : "s"} now`;
  } else if (hasHistory) {
    title = "You’re up to date 🎉";
    subtitle =
      "No cards are due right now. You can still practise SAC questions or prime a new topic.";
    buttonLabel = "Start a new practice session";
  } else {
    title = "Welcome to D1 Education 👋";
    subtitle =
      "Start by uploading your first question or example from a SAC, homework, or VCAA exam. I’ll handle the review schedule for you.";
    buttonLabel = "Upload your first question";
  }

  return (
    <section className="w-full mb-6">
      <div className="rounded-2xl border border-gray-200 bg-white/80 shadow-sm px-6 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-gray-600">{subtitle}</p>

          {hasDue && (
            <p className="text-xs text-gray-500 mt-1">
              Reviewing a few cards each session keeps concepts fresh and prevents forgetting.
            </p>
          )}
        </div>

        <div className="mt-3 sm:mt-0 flex items-center gap-3">
          {hasHistory && (
            <div className="text-xs text-gray-500 text-right">
              <div>Total attempts: {totalAttempts}</div>
              {hasDue && <div>Due today: {numDue}</div>}
            </div>
          )}

          <button
            type="button"
            onClick={onStartSession}
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium bg-black text-white hover:bg-gray-900 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
