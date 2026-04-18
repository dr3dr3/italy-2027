export default function Loading() {
  return (
    <main className="min-h-screen text-ink px-6 py-12">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="h-4 w-24 rounded bg-dust/70" />

        <header className="mt-6 mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="h-10 w-72 rounded bg-dust/80" />
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-6 w-16 rounded-full bg-dust/70" />
            <div className="h-8 w-14 rounded-full bg-dust/70" />
            <div className="h-8 w-14 rounded-full bg-dust/70" />
          </div>
        </header>

        <section className="mb-10">
          <div className="h-7 w-52 rounded bg-dust/70" />
          <div className="mt-4 h-64 rounded-lg bg-dust/60" />
        </section>

        <div className="h-7 w-44 rounded bg-dust/70" />

        <ol className="mt-6 space-y-8">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <div className="h-7 w-40 rounded bg-dust/70" />
              <div className="mt-3 space-y-4">
                {[0, 1].map((j) => (
                  <div
                    key={j}
                    className="rounded-lg border border-dust bg-white/85 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-2/3 rounded bg-dust/70" />
                        <div className="h-4 w-1/3 rounded bg-dust/60" />
                      </div>
                      <div className="h-8 w-14 rounded-full bg-dust/70" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-4 w-full rounded bg-dust/50" />
                      <div className="h-4 w-5/6 rounded bg-dust/50" />
                    </div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
