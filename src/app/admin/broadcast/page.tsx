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
            Broadcast
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            What to tell the group
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink/70">
            The last {WINDOW_DAYS} days of noteworthy activity. Copy any of
            these into WhatsApp, paste, edit, send.
          </p>
        </header>
        <div className="mt-8">
          <BroadcastList events={serialize(events)} baseUrl={baseUrl} />
        </div>
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
