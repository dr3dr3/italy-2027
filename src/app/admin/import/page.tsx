import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { ItineraryImport } from "@/components/admin/itinerary-import";

export default async function AdminImportPage() {
  const session = await auth();
  if (!session?.user?.isEditor) redirect("/");

  return (
    <main className="min-h-screen bg-cream text-ink px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-ink/60 hover:text-ink">
          ← Le opzioni
        </Link>
        <header className="mt-6 mb-8">
          <h1 className="font-serif text-4xl font-semibold">Importer</h1>
          <p className="mt-2 text-base text-ink/70">
            Paste itinerary JSON below. It&apos;ll be upserted by slug —
            matching existing itineraries get replaced wholesale including
            stops. New slugs create new itineraries.
          </p>
        </header>
        <ItineraryImport />
      </div>
    </main>
  );
}
