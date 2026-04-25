import Link from "next/link";

export const metadata = {
  title: "Nerede? · Italia 2027",
};

export default function NotFound() {
  return (
    <main className="min-h-screen px-6 py-10 text-ink md:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.22em] text-ink/55">
          <span>Italia &middot; MMXXVII</span>
          <span className="text-ink/45 normal-case tracking-normal font-serif italic">
            fuori strada
          </span>
        </div>
        <div className="mt-3 border-t border-ink/12" />
      </div>

      <div className="mx-auto max-w-5xl">
        <header className="mt-16 md:mt-28">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
            404 &middot; non trovato
          </p>
          <h1
            className="mt-3 font-serif font-semibold leading-[1.0] tracking-tight"
            style={{ fontSize: "clamp(3.25rem, 12vw, 8rem)" }}
          >
            Nerede?
          </h1>
          <p className="mt-6 max-w-2xl font-serif text-xl italic text-ink/70 md:text-2xl">
            Yeah nah &mdash; you&apos;ve wandered off the map.
          </p>
          <p className="mt-4 max-w-xl text-base text-ink/60">
            Could be a dud link. Could be one spritz too many. Either way, this
            page isn&apos;t a real place.
          </p>
          <Link
            href="/"
            className="mt-12 inline-block font-serif text-lg italic text-terracotta hover:text-ink"
          >
            &larr; Torna a casa{" "}
            <span className="text-ink/40">/ back home</span>
          </Link>
        </header>

        <div
          className="mt-24 select-none text-center font-serif text-2xl text-ink/20"
          aria-hidden="true"
        >
          ❦
        </div>
      </div>
    </main>
  );
}
