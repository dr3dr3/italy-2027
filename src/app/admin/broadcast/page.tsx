import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getRecentActivity } from "@/lib/queries/broadcast";
import { BroadcastList } from "@/components/admin/broadcast-list";

const WINDOW_DAYS = 7;

export default async function AdminBroadcastPage() {
  const session = await auth();
  if (!session?.user?.isEditor) redirect("/");

  const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [events, baseUrl] = await Promise.all([
    getRecentActivity(cutoff),
    resolveBaseUrl(),
  ]);

  return (
    <main className="min-h-screen bg-cream text-ink px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-ink/60 hover:text-ink">
          ← Le opzioni
        </Link>
        <header className="mt-6 mb-8">
          <h1 className="font-serif text-4xl font-semibold">
            Broadcast <span className="text-ink/40">/</span>{" "}
            <span className="text-ink/70">what to tell the group</span>
          </h1>
          <p className="mt-2 text-base text-ink/70">
            The last {WINDOW_DAYS} days of noteworthy activity. Copy any of
            these into WhatsApp, paste, edit, send.
          </p>
        </header>
        <BroadcastList events={serialize(events)} baseUrl={baseUrl} />
      </div>
    </main>
  );
}

async function resolveBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3033";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Serialise Date → ISO string for the client boundary.
function serialize(events: Awaited<ReturnType<typeof getRecentActivity>>) {
  return events.map((e) => ({ ...e, at: e.at.toISOString() }));
}
