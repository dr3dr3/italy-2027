import Link from "next/link";
import { desc, inArray, min, max, count } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db, itineraries, stops } from "@/db";
import { Button } from "@/components/ui/button";
import { daysUntil, formatRange } from "@/lib/dates";
import { VoteButton } from "@/components/votes/vote-button";
import { getItineraryVoteSummariesForUser } from "@/lib/queries/votes";
import { getStopsForActiveItineraries } from "@/lib/queries/stops";
import { OverviewMapLoader } from "@/components/map/overview-map-loader";
import type { OverviewItinerary } from "@/components/map/overview-map";
import { ItineraryStatusControl } from "@/components/itineraries/itinerary-status-control";
import { ArchivedToggle } from "@/components/itineraries/archived-toggle";
import { ActiveUsers } from "@/components/presence/active-users";
import { getActivePresence } from "@/lib/queries/users";
import { WishlistSection } from "@/components/wishlist/wishlist-section";
import { PhraseOfTheDay } from "@/components/phrase-of-the-day";
import {
  getPendingWishlist,
  getPromotionTargets,
} from "@/lib/queries/wishlist";
import { getCommentsForPendingWishlist } from "@/lib/queries/comments";

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
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

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

// Earliest arriveDate across visible itineraries — drives the masthead
// countdown. Returns null when no stops exist yet.
function earliestArrive(rows: ListableRow[]): string | null {
  let earliest: string | null = null;
  for (const r of rows) {
    const d = r.span?.earliest;
    if (typeof d !== "string" || d.length === 0) continue;
    if (earliest === null || d < earliest) earliest = d;
  }
  return earliest;
}

function EditorialItineraryItem({
  it,
  index,
  lead,
  vote,
  isEditor,
  style,
}: {
  it: ListableRow;
  index: number;
  lead: boolean;
  vote: { count: number; userHasVoted: boolean };
  isEditor: boolean;
  style?: React.CSSProperties;
}) {
  const numeral = ROMAN[index] ?? `${index + 1}`;
  return (
    <li
      className="animate-in border-b border-ink/12 first:border-t first:border-ink/12"
      style={style}
    >
      <div
        className={[
          "grid grid-cols-[2rem_1fr_auto] items-start gap-x-4 md:grid-cols-[3rem_1fr_auto] md:gap-x-6",
          lead ? "py-7 md:py-10" : "py-5 md:py-7",
        ].join(" ")}
      >
        <div
          className={[
            "pt-1 font-serif italic text-ink/40 tabular-nums",
            lead ? "text-xl md:text-2xl" : "text-base md:text-lg",
          ].join(" ")}
          aria-hidden="true"
        >
          {numeral}.
        </div>
        <div className="min-w-0">
          <Link href={`/itineraries/${it.slug}`} className="group block">
            <h3
              className={[
                "font-serif font-semibold leading-[1.1] tracking-tight transition-colors group-hover:text-terracotta",
                lead ? "text-3xl md:text-4xl" : "text-xl md:text-2xl",
              ].join(" ")}
            >
              {it.title}
            </h3>
          </Link>
          <p className="mt-2 text-sm text-ink/60">
            {it.span?.earliest && it.span?.latest ? (
              <>
                <span>{formatRange(it.span.earliest, it.span.latest)}</span>
                <span className="mx-2 text-ink/25" aria-hidden="true">·</span>
                <span>{it.span.stopCount} stops</span>
                {it.status !== "active" && (
                  <>
                    <span className="mx-2 text-ink/25" aria-hidden="true">·</span>
                    <span className="italic">{it.status}</span>
                  </>
                )}
              </>
            ) : (
              <span className="italic">No stops yet.</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <VoteButton
            targetType="itinerary"
            targetId={it.id}
            count={vote.count}
            userHasVoted={vote.userHasVoted}
            label={it.title}
          />
          {isEditor && (
            <ItineraryStatusControl
              itineraryId={it.id}
              status={it.status as "draft" | "active" | "archived"}
            />
          )}
        </div>
      </div>
    </li>
  );
}

export default async function Home() {
  const session = await auth();
  const name = session?.user?.name ?? "friend";
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const isEditor = Boolean(session?.user?.isEditor);

  const [
    visible,
    overview,
    archived,
    presences,
    wishlist,
    wishlistComments,
    promotionTargets,
  ] = await Promise.all([
    loadItinerariesByStatus(isEditor ? ["draft", "active"] : ["active"]),
    loadOverviewItineraries(),
    isEditor ? loadItinerariesByStatus(["archived"]) : Promise.resolve([]),
    getActivePresence(),
    getPendingWishlist(userId),
    getCommentsForPendingWishlist(),
    isEditor ? getPromotionTargets() : Promise.resolve([]),
  ]);

  const visibleVoteIds = visible.map((r) => r.id);
  const archivedVoteIds = archived.map((r) => r.id);
  const [visibleVotes, archivedVotes] = await Promise.all([
    getItineraryVoteSummariesForUser(visibleVoteIds, userId),
    archivedVoteIds.length > 0
      ? getItineraryVoteSummariesForUser(archivedVoteIds, userId)
      : Promise.resolve(new Map()),
  ]);

  const earliest = earliestArrive(visible);
  const countdown = earliest ? daysUntil(earliest) : null;

  return (
    <main className="min-h-screen text-ink px-6 py-10 md:py-14">
      {/* Masthead */}
      <div className="mx-auto max-w-5xl">
        <div className="animate-in flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-ink/55">
            <span>Italia &middot; MMXXVII</span>
            {countdown !== null && (
              <>
                <span className="text-ink/25" aria-hidden="true">·</span>
                <span title={`${countdown} days until departure`}>
                  No. {countdown}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
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
        </div>
        <div className="mt-3 border-t border-ink/12" />
      </div>

      {/* Greeting + frase aside */}
      <div className="mx-auto max-w-5xl">
        <header className="mt-10 grid items-end gap-8 md:mt-16 md:grid-cols-[1fr_minmax(0,22rem)] md:gap-14">
          <div className="animate-in" style={{ animationDelay: "80ms" }}>
            <h1
              className="font-serif font-semibold leading-[1.02] tracking-tight"
              style={{ fontSize: "clamp(2.75rem, 7vw, 5rem)" }}
            >
              Ciao,{" "}
              <span className="italic font-normal text-ink/85">{name}</span>.
            </h1>
            <p className="mt-5 font-serif italic text-lg text-ink/70">
              Le opzioni &mdash; what we&apos;re thinking.
            </p>
            <ActiveUsers presences={presences} currentUserId={userId} />
          </div>
          <aside
            className="animate-in md:max-w-[22rem] md:self-end md:justify-self-end"
            style={{ animationDelay: "160ms" }}
          >
            <PhraseOfTheDay />
          </aside>
        </header>
      </div>

      {/* Overview map — breaks out to wider container */}
      {overview.length > 0 && (
        <section
          className="animate-in mx-auto mt-14 max-w-5xl md:mt-20"
          style={{ animationDelay: "240ms" }}
        >
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
              La mappa
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight md:text-3xl">
              At a glance
            </h2>
          </div>
          <OverviewMapLoader itineraries={overview} />
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink/12 pt-3 text-sm">
            {overview.map((it) => (
              <li key={it.id}>
                <Link
                  href={`/itineraries/${it.slug}`}
                  className="inline-flex items-baseline gap-2 text-ink/70 hover:text-ink"
                >
                  <span
                    className="font-serif text-base font-semibold italic"
                    style={{ color: it.colour }}
                  >
                    {it.label}.
                  </span>
                  <span>{it.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Il piano — itinerary list */}
      <section
        className="animate-in mx-auto mt-14 max-w-3xl md:mt-20"
        style={{ animationDelay: "320ms" }}
      >
        {visible.length === 0 && archived.length === 0 ? (
          <p className="text-base text-ink/70">
            Ozzie hasn&apos;t cooked anything up yet. Sit tight.
          </p>
        ) : visible.length > 0 ? (
          <>
            <div className="flex items-baseline gap-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
                Il piano
              </p>
              <span className="text-ink/25" aria-hidden="true">·</span>
              <p className="font-serif text-base italic text-ink/60">
                plans on the table
              </p>
            </div>
            <ul className="mt-5">
              {visible.map((it, i) => (
                <EditorialItineraryItem
                  key={it.id}
                  it={it}
                  index={i}
                  lead={i === 0}
                  vote={
                    visibleVotes.get(it.id) ?? { count: 0, userHasVoted: false }
                  }
                  isEditor={isEditor}
                  style={{ animationDelay: `${400 + i * 80}ms` }}
                />
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {/* Wishlist */}
      <div className="mx-auto mt-14 max-w-3xl md:mt-20">
        <WishlistSection
          rows={wishlist}
          comments={wishlistComments}
          currentUserId={userId}
          isEditor={isEditor}
          promotionTargets={promotionTargets}
        />
      </div>

      {/* Archived (editors) */}
      {isEditor && archived.length > 0 && (
        <div className="mx-auto max-w-3xl">
          <ArchivedToggle count={archived.length}>
            <ul>
              {archived.map((it, i) => (
                <EditorialItineraryItem
                  key={it.id}
                  it={it}
                  index={i}
                  lead={false}
                  vote={
                    archivedVotes.get(it.id) ?? { count: 0, userHasVoted: false }
                  }
                  isEditor={isEditor}
                />
              ))}
            </ul>
          </ArchivedToggle>
        </div>
      )}
    </main>
  );
}
