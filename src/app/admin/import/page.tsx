import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { ItineraryImport } from "@/components/admin/itinerary-import";

export default async function AdminImportPage() {
  const session = await auth();
  if (!session?.user?.isEditor) redirect("/");

  return (
    <main className="min-h-screen text-ink px-6 py-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="animate-in flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-ink/55">
            <span>Italia &middot; MMXXVII</span>
          </div>
          <Link
            href="/"
            className="text-sm text-ink/60 hover:text-ink"
          >
            &larr; Le opzioni
          </Link>
        </div>
        <div className="mt-3 border-t border-ink/12" />
      </div>

      <div className="mx-auto mt-10 max-w-3xl md:mt-14">
        <header className="animate-in" style={{ animationDelay: "80ms" }}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
            Admin
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Importer
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink/70">
            Paste itinerary JSON below. It&apos;ll be upserted by slug —
            matching existing itineraries get replaced wholesale including
            stops. New slugs create new itineraries.
          </p>
          <p className="mt-3 text-sm text-ink/60">
            Starting from scratch?{" "}
            <Link
              href="/admin/prompt-generator"
              className="underline decoration-dust underline-offset-4 hover:decoration-terracotta"
            >
              Generate a prompt
            </Link>{" "}
            to draft one with an AI.
          </p>
        </header>
        <div className="mt-8">
          <ItineraryImport />
        </div>
      </div>
    </main>
  );
}
