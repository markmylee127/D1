import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
        Review detail
      </p>
      <h1 className="text-2xl font-semibold text-zinc-100">
        Review #{id}
      </h1>
      <p className="text-sm text-zinc-400">
        This page is ready for the review detail UI.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 inline-flex w-fit text-sm text-yellow-500 hover:text-yellow-400"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
