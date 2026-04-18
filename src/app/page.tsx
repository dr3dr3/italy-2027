import Link from "next/link";
import { desc, inArray, min, max, count } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db, itineraries, stops } from "@/db";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatRange } from "@/lib/dates";
import { VoteButton } from "@/components/votes/vote-button";
import { getItineraryVoteSummariesForUser } from "@/lib/queries/votes";
import { getStopsForActiveItineraries } from "@/lib/queries/stops";
import { OverviewMapLoader } from "@/components/map/overview-map-loader";
import type { OverviewItinerary } from "@/components/map/overview-map";
import { ItineraryStatusControl } from "@/components/itineraries/itinerary-status-control";
import { ArchivedToggle } from "@/components/itineraries/archived-toggle";
import { ActiveUsers } from "@/components/presence/active-users";
import { getActivePresence } from "@/lib/queries/users";

// Per-itinerary styling. Colour + dash pattern differ together so colour-blind
// viewers have two redundant encodings. Labels (A/B/…) land on the pins and
// legend for a third.
const OVERVIEW_STYLES = [
  { colour: "#c65d3a", dashArray: "6 8" as string | undefined },
  { colour: "#6b7a3f", dashArray: "2 6" as string | undefined },
  { colour: "#7a2e2e", dashArray: "12 6" as string | undefined },
  { colour: "#1a1a1a", dashArray: undefined as string | undefined },
] as const;
const LABELS = ["A", "B", "C", "D"] as const;

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

async function loadOverviewItineraries(): Promise<OverviewItinerary[]> {
  const rows = await getStopsForActiveItineraries();
  const byId = new Map<number, OverviewItinerary>();
  for (const r of rows) {
    if (r.lat === null || r.lng === null) continue;
    let it = byId.get(r.itineraryId);
    if (!it) {
      it = {
        id: r.itineraryId,
        slug: r.itinerarySlug,
        title: r.itineraryTitle,
        colour: "",
        label: "",
        dashArray: undefined,
        stops: [],
      };
      byId.set(r.itineraryId, it);
    }
    it.stops.push({
      id: r.id,
      name: r.name,
      day: r.day,
      orderInDay: r.orderInDay,
      lat: Number(r.lat),
      lng: Number(r.lng),
    });
  }
  // Stable style assignment by itinerary id asc.
  const ordered = [...byId.values()].sort((a, b) => a.id - b.id);
  ordered.forEach((it, i) => {
    const style = OVERVIEW_STYLES[i] ?? OVERVIEW_STYLES[OVERVIEW_STYLES.length - 1];
    it.colour = style.colour;
    it.dashArray = style.dashArray;
    it.label = LABELS[i] ?? String(i + 1);
  });
  return ordered;
}

type ListableRow = Awaited<ReturnType<typeof loadItinerariesByStatus>>[number];

async function loadItinerariesByStatus(statuses: Array<"draft" | "active" | "archived">) {
  if (statuses.length === 0) return [];
  const rows = await db
    .select()
    .from(itineraries)
    .where(inArray(itineraries.status, statuses))
    .orderBy(desc(itineraries.updatedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const spans = await db
    .select({
      itineraryId: stops.itineraryId,
      earliest: min(stops.arriveDate),
      latest: max(stops.departDate),
      stopCount: count(stops.id),
    })
    .from(stops)
    .where(inArray(stops.itineraryId, ids))
    .groupBy(stops.itineraryId);

  const byId = new Map(spans.map((s) => [s.itineraryId, s]));
  return rows.map((r) => ({ ...r, span: byId.get(r.id) }));
}

function ItineraryCard({
  it,
  vote,
  isEditor,
}: {
  it: ListableRow;
  vote: { count: number; userHasVoted: boolean };
  isEditor: boolean;
}) {
  return (
    <li className="relative">
      <Link
        href={`/itineraries/${it.slug}`}
        className="block rounded-lg border border-dust bg-white/85 p-6 pb-14 transition-colors hover:bg-white"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold">{it.title}</h2>
          <StatusBadge status={it.status} />
        </div>
        <p className="mt-2 text-sm text-ink/60">
          {it.span?.earliest && it.span?.latest ? (
            <>
              {formatRange(it.span.earliest, it.span.latest)} ·{" "}
              {it.span.stopCount} stops
            </>
          ) : (
            <>No stops yet.</>
          )}
        </p>
      </Link>
      <div className="absolute bottom-4 right-4">
        <VoteButton
          targetType="itinerary"
          targetId={it.id}
          count={vote.count}
          userHasVoted={vote.userHasVoted}
          label={it.title}
        />
      </div>
      {isEditor && (
        <div className="absolute right-4 top-14">
          <ItineraryStatusControl
            itineraryId={it.id}
            status={it.status as "draft" | "active" | "archived"}
          />
        </div>
      )}
    </li>
  );
}

export default async function Home() {
  const session = await auth();
  const name = session?.user?.name ?? "friend";
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const isEditor = Boolean(session?.user?.isEditor);

  const [visible, overview, archived, presences] = await Promise.all([
    loadItinerariesByStatus(isEditor ? ["draft", "active"] : ["active"]),
    loadOverviewItineraries(),
    isEditor ? loadItinerariesByStatus(["archived"]) : Promise.resolve([]),
    getActivePresence(),
  ]);

  const visibleVoteIds = visible.map((r) => r.id);
  const archivedVoteIds = archived.map((r) => r.id);
  const [visibleVotes, archivedVotes] = await Promise.all([
    getItineraryVoteSummariesForUser(visibleVoteIds, userId),
    archivedVoteIds.length > 0
      ? getItineraryVoteSummariesForUser(archivedVoteIds, userId)
      : Promise.resolve(new Map()),
  ]);

  return (
    <main className="min-h-screen text-ink px-6 py-12">
      <div className="absolute right-6 top-6 flex items-center gap-4">
        {isEditor && (
          <Link
            href="/admin/import"
            className="text-sm text-ink/60 hover:text-terracotta"
          >
            Import →
          </Link>
        )}
        <form action={handleSignOut}>
          <Button
            type="submit"
            variant="ghost"
            className="text-sm text-ink/70 hover:text-ink"
          >
            Sign out
          </Button>
        </form>
      </div>

      <div className="mx-auto max-w-3xl">
        <header className="mt-16 mb-12">
          <h1 className="font-serif text-4xl font-semibold">Ciao, {name}.</h1>
          <p className="mt-2 text-base text-ink/60">
            Le opzioni <span className="text-ink/40">/ the options</span>
          </p>
          <ActiveUsers presences={presences} currentUserId={userId} />
        </header>

        {overview.length > 0 && (
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold">
              Le possibilità{" "}
              <span className="text-ink/40 text-xl font-normal">
                / the options
              </span>
            </h2>
            <div className="mt-4">
              <OverviewMapLoader itineraries={overview} />
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {overview.map((it) => (
                <li key={it.id}>
                  <Link
                    href={`/itineraries/${it.slug}`}
                    className="inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink"
                  >
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-cream"
                      style={{ backgroundColor: it.colour }}
                    >
                      {it.label}
                    </span>
                    {it.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {visible.length === 0 && archived.length === 0 ? (
          <p className="text-base text-ink/70">
            Ozzie hasn&apos;t cooked anything up yet. Sit tight.
          </p>
        ) : (
          <ul className="space-y-4">
            {visible.map((it) => (
              <ItineraryCard
                key={it.id}
                it={it}
                vote={visibleVotes.get(it.id) ?? { count: 0, userHasVoted: false }}
                isEditor={isEditor}
              />
            ))}
          </ul>
        )}

        {isEditor && (
          <ArchivedToggle count={archived.length}>
            <ul className="space-y-4">
              {archived.map((it) => (
                <ItineraryCard
                  key={it.id}
                  it={it}
                  vote={
                    archivedVotes.get(it.id) ?? { count: 0, userHasVoted: false }
                  }
                  isEditor={isEditor}
                />
              ))}
            </ul>
          </ArchivedToggle>
        )}
      </div>
    </main>
  );
}
