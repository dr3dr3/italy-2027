import Link from "next/link";

export const metadata = {
  title: "Offline — Italia 2027",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-serif text-3xl text-ink">Signal&apos;s crook.</h1>
      <p className="mt-3 text-ink/70">
        Looks like you&apos;re offline. Pages you&apos;ve already opened will
        still load — for anything else, try again when you&apos;re back on the
        grid.
      </p>
      <Link
        href="/"
        className="mt-8 rounded border border-ink/20 px-4 py-2 text-sm text-ink hover:bg-dust/60"
      >
        Back to the plan
      </Link>
    </main>
  );
}
