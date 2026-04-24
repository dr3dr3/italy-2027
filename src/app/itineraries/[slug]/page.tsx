import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import { db, itineraries, stops } from "@/db";
import { daysUntil, formatDay, formatRange } from "@/lib/dates";
import { auth } from "@/auth";
import { CommentThread } from "@/components/comments/comment-thread";
import { StopCommentsToggle } from "@/components/comments/stop-comments";
import {
  getCommentsFor,
  getStopCommentCountsForItinerary,
  getStopCommentsForItinerary,
  getSuggestionCommentsForItinerary,
} from "@/lib/queries/comments";
import { VoteButton } from "@/components/votes/vote-button";
import {
  getItineraryVoteSummary,
  getStopVoteSummariesForItinerary,
} from "@/lib/queries/votes";
import { SuggestionsSection } from "@/components/suggestions/suggestions-section";
import { getSuggestionsForItinerary } from "@/lib/queries/suggestions";
import { VideosSection } from "@/components/videos/videos-section";
import { getVideosForItinerary } from "@/lib/queries/videos";
import { VisitsSection } from "@/components/visits/visits-section";
import { getVisitsForItinerary } from "@/lib/queries/visits";
import { ItineraryMapLoader } from "@/components/map/itinerary-map-loader";
import type { MapStop, MapVisit } from "@/components/map/itinerary-map";
import { ItineraryStatusControl } from "@/components/itineraries/itinerary-status-control";
import { ParticipationsSection } from "@/components/participations/participations-section";
import { AbsenteePill } from "@/components/participations/absentee-pill";
import {
  getParticipationsForItinerary,
  getRecentOtherParticipation,
  getTripMates,
  type PrefillCandidate,
} from "@/lib/queries/participations";
import {
  buildPeopleList,
  computeAbsenteesByStop,
} from "@/lib/participations";

type Stop = typeof stops.$inferSelect;

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function statusTone(status: string): "olive" | "ink" | "wine" | "terra" {
  switch (status) {
    case "active": return "olive";
    case "draft": return "ink";
    case "archived": return "ink";
    default: return "ink";
  }
}

// Deterministic rotation so each stamp sits at its own slight angle (real
// stamps are never perfectly aligned). Seeded by id so it's stable across
// renders but varies between items on the page. Skips 0° — a non-rotated
// stamp just reads as a pill.
function stampRotation(seed: number): number {
  const magnitude = ((seed * 17) % 4) + 1; // 1..4
  const sign = seed % 2 === 0 ? 1 : -1;
  return magnitude * 0.9 * sign; // ±0.9, ±1.8, ±2.7, ±3.6
}

function groupByDay(rows: Stop[]): Map<number, Stop[]> {
  const byDay = new Map<number, Stop[]>();
  for (const s of rows) {
    const bucket = byDay.get(s.day) ?? [];
    bucket.push(s);
    byDay.set(s.day, bucket);
  }
  return byDay;
}

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [itinerary] = await db
    .select()
    .from(itineraries)
    .where(eq(itineraries.slug, slug))
    .limit(1);
  if (!itinerary) notFound();

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const isEditor = Boolean(session?.user?.isEditor);

  // All data for this page is fetched here — not in child components.
  // This avoids N+1 queries when rendering N stops. If you add a new
  // data source per stop, add an itinerary-scoped query and fetch it here.
  // Do not add per-stop fetches inside the render loop.
  const [
    stopRows,
    stopCommentCounts,
    stopComments,
    suggestionComments,
    stopVotes,
    itineraryVote,
    allSuggestions,
    allVideos,
    itineraryComments,
    allVisits,
    participationRows,
    tripMates,
  ] = await Promise.all([
    db
      .select()
      .from(stops)
      .where(eq(stops.itineraryId, itinerary.id))
      .orderBy(asc(stops.day), asc(stops.orderInDay)),
    getStopCommentCountsForItinerary(itinerary.id),
    getStopCommentsForItinerary(itinerary.id),
    getSuggestionCommentsForItinerary(itinerary.id),
    getStopVoteSummariesForItinerary(itinerary.id, userId),
    getItineraryVoteSummary(itinerary.id, userId),
    getSuggestionsForItinerary(itinerary.id, userId),
    getVideosForItinerary(itinerary.id),
    getCommentsFor("itinerary", itinerary.id),
    getVisitsForItinerary(itinerary.id),
    getParticipationsForItinerary(itinerary.id),
    getTripMates(),
  ]);

  // Next-stop lookup for enroute visit headings ("on the drive to X").
  // stopRows is already ordered by (day, order_in_day); the last row has no
  // next, so enroute visits there are either missing (blocked by validation)
  // or render with a generic heading.
  const nextStopName = new Map<number, string>();
  for (let i = 0; i < stopRows.length - 1; i++) {
    nextStopName.set(stopRows[i].id, stopRows[i + 1].name);
  }

  const days = groupByDay(stopRows);
  const dayNumbers = [...days.keys()].sort((a, b) => a - b);

  const people = buildPeopleList(tripMates, participationRows);
  const absenteesByStop = computeAbsenteesByStop(stopRows, people);
  const tripStart = stopRows[0]?.arriveDate ?? null;
  const tripEnd = stopRows[stopRows.length - 1]?.departDate ?? null;

  // Prefill the current user's edit form with their most-recent window from
  // another itinerary — but only if they haven't set one here yet, and only
  // if the dates fit within this trip's span.
  let prefill: PrefillCandidate | null = null;
  if (userId !== null && !participationRows.has(userId)) {
    const candidate = await getRecentOtherParticipation(userId, itinerary.id);
    if (candidate) {
      const inSpan = (d: string | null) =>
        d === null ||
        ((tripStart === null || d >= tripStart) &&
          (tripEnd === null || d <= tripEnd));
      if (inSpan(candidate.joinsOn) && inSpan(candidate.departsOn)) {
        prefill = candidate;
      }
    }
  }

  const mapStops: MapStop[] = stopRows
    .filter((s): s is Stop & { lat: string; lng: string } =>
      s.lat !== null && s.lng !== null,
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      day: s.day,
      orderInDay: s.orderInDay,
      lat: Number(s.lat),
      lng: Number(s.lng),
      arriveDate: s.arriveDate,
      departDate: s.departDate,
    }));

  const mapVisits: MapVisit[] = [];
  for (const bucket of allVisits.values()) {
    for (const v of [...bucket.daytrips, ...bucket.enroute]) {
      if (v.lat === null || v.lng === null) continue;
      mapVisits.push({
        id: v.id,
        name: v.name,
        kind: v.kind,
        lat: Number(v.lat),
        lng: Number(v.lng),
        visitDate: v.visitDate,
      });
    }
  }

  const countdown = tripStart ? daysUntil(tripStart) : null;

  // Editorial subtitle — "First → Last · N days". Collapses to a single name
  // when the trip starts and ends at the same place (or has only one stop).
  const firstName = stopRows[0]?.name;
  const lastName = stopRows[stopRows.length - 1]?.name;
  const dayCount = dayNumbers.length;
  const dayLabel = dayCount === 1 ? "day" : "days";
  const subtitle =
    firstName && lastName && dayCount > 0
      ? firstName === lastName || stopRows.length === 1
        ? `${firstName} · ${dayCount} ${dayLabel}`
        : `${firstName} → ${lastName} · ${dayCount} ${dayLabel}`
      : null;

  const tone = statusTone(itinerary.status);
  const statusRotation = stampRotation(itinerary.id);

  return (
    <main className="min-h-screen text-ink">
      {/* Masthead — shared visual language with the home */}
      <div className="mx-auto max-w-5xl px-6 pt-10 md:pt-14">
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
          <Link
            href="/"
            className="text-sm text-ink/60 hover:text-ink"
          >
            ← Le opzioni
          </Link>
        </div>
        <div className="mt-3 border-t border-ink/12" />
      </div>

      {/* Title block */}
      <div className="mx-auto max-w-5xl px-6">
        <header
          className="animate-in mt-10 grid items-end gap-6 md:mt-16 md:grid-cols-[1fr_auto] md:gap-12"
          style={{ animationDelay: "80ms" }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
              Itinerario
            </p>
            <h1
              className="mt-2 font-serif font-semibold leading-[1.02] tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
            >
              {itinerary.title}
            </h1>
            {subtitle && (
              <p className="mt-4 font-serif italic text-lg text-ink/70">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end md:self-end md:pb-3">
            <span
              className={`stamp stamp-${tone}`}
              style={{ transform: `rotate(${statusRotation}deg)` }}
            >
              {itinerary.status}
            </span>
            {isEditor && (
              <ItineraryStatusControl
                itineraryId={itinerary.id}
                status={itinerary.status as "draft" | "active" | "archived"}
              />
            )}
            <a
              href="#discussion"
              aria-label={`Jump to discussion (${itineraryComments.length} comments)`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dust bg-white/85 px-2.5 text-sm text-ink/70 transition-colors hover:border-ink/30 hover:text-ink"
            >
              <MessageCircle className="size-4" />
              <span className="tabular-nums">{itineraryComments.length}</span>
            </a>
            <VoteButton
              targetType="itinerary"
              targetId={itinerary.id}
              count={itineraryVote.count}
              userHasVoted={itineraryVote.userHasVoted}
              label={itinerary.title}
            />
          </div>
        </header>
      </div>

      {/* Map */}
      <section
        className="animate-in mx-auto mt-12 max-w-5xl px-6 md:mt-16"
        style={{ animationDelay: "160ms" }}
      >
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
            La mappa
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight md:text-3xl">
            The map
          </h2>
        </div>
        {mapStops.length > 0 ? (
          <ItineraryMapLoader stops={mapStops} visits={mapVisits} />
        ) : (
          <p className="font-serif italic text-base text-ink/55">
            Somewhere in Italy, probably.
          </p>
        )}
      </section>

      {/* Participations */}
      <div className="mx-auto mt-12 max-w-3xl px-6 md:mt-16">
        <ParticipationsSection
          itineraryId={itinerary.id}
          people={people}
          currentUserId={userId}
          prefill={prefill}
          tripStart={tripStart}
          tripEnd={tripEnd}
        />
      </div>

      {/* Ornamental break */}
      <div
        className="mx-auto mt-16 max-w-3xl select-none px-6 text-center font-serif text-2xl text-ink/25"
        aria-hidden="true"
      >
        ❦
      </div>

      {/* Il piano — plan */}
      <section className="mx-auto mt-8 max-w-3xl px-6">
        <div
          className="animate-in flex items-baseline gap-3"
          style={{ animationDelay: "240ms" }}
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
            Il piano
          </p>
          <span className="text-ink/25" aria-hidden="true">·</span>
          <p className="font-serif text-base italic text-ink/60">the plan</p>
        </div>

        {dayNumbers.length > 1 && (
          <nav
            className="animate-in mt-4 flex flex-wrap gap-x-4 gap-y-1"
            style={{ animationDelay: "300ms" }}
          >
            {dayNumbers.map((day) => (
              <a
                key={day}
                href={`#day-${day}`}
                className="font-serif text-sm italic text-ink/55 tabular-nums hover:text-ink"
              >
                {day}
              </a>
            ))}
          </nav>
        )}

        <ol className="mt-8">
          {dayNumbers.map((day, dayIdx) => {
            const dayStops = days.get(day)!;
            const firstArrive = dayStops[0].arriveDate;
            return (
              <li
                key={day}
                id={`day-${day}`}
                className="animate-in mt-14 scroll-mt-16 first:mt-0 sm:scroll-mt-6"
                style={{ animationDelay: `${360 + dayIdx * 80}ms` }}
              >
                <header>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
                    Giorno {day}
                  </p>
                  <h3 className="mt-1 font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                    {firstArrive ? formatDay(firstArrive) : `Day ${day}`}
                  </h3>
                  <div className="mt-3 border-t border-ink/15" />
                </header>
                <div className="mt-6">
                  {dayStops.map((s, stopIdx) => {
                    const v = stopVotes.get(s.id) ?? {
                      count: 0,
                      userHasVoted: false,
                    };
                    const numeral = ROMAN[stopIdx] ?? `${stopIdx + 1}`;
                    const isFirstStop = dayIdx === 0 && stopIdx === 0;
                    return (
                      <article
                        key={s.id}
                        id={`stop-${s.id}`}
                        className="scroll-mt-16 border-b border-ink/10 py-7 last:border-b-0 md:py-9 sm:scroll-mt-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
                              Tappa{" "}
                              <span className="not-italic">{numeral}</span>
                            </p>
                            <h4 className="mt-1 font-serif text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                              {s.name}
                            </h4>
                            {s.arriveDate && s.departDate && (
                              <p className="mt-2 font-serif text-sm italic text-ink/55">
                                {formatRange(s.arriveDate, s.departDate)}
                              </p>
                            )}
                          </div>
                          <VoteButton
                            targetType="stop"
                            targetId={s.id}
                            count={v.count}
                            userHasVoted={v.userHasVoted}
                            label={s.name}
                          />
                        </div>
                        {s.description && (
                          <p
                            className={`mt-4 text-base leading-relaxed text-ink/85 ${
                              isFirstStop ? "drop-cap" : ""
                            }`}
                          >
                            {s.description}
                          </p>
                        )}
                        <AbsenteePill
                          absentees={absenteesByStop.get(s.id) ?? []}
                        />
                        <div className="mt-6 space-y-6">
                          <VideosSection
                            stopId={s.id}
                            videos={allVideos.get(s.id) ?? []}
                            currentUserId={userId}
                            isEditor={isEditor}
                          />
                          <SuggestionsSection
                            stopId={s.id}
                            suggestions={allSuggestions.get(s.id) ?? []}
                            suggestionComments={suggestionComments}
                            currentUserId={userId}
                            isEditor={isEditor}
                          />
                          <VisitsSection
                            visits={
                              allVisits.get(s.id) ?? {
                                daytrips: [],
                                enroute: [],
                              }
                            }
                            nextStopName={nextStopName.get(s.id) ?? null}
                            isEditor={isEditor}
                          />
                          <StopCommentsToggle
                            count={stopCommentCounts.get(s.id) ?? 0}
                          >
                            <CommentThread
                              targetType="stop"
                              targetId={s.id}
                              initialRows={stopComments.get(s.id) ?? []}
                              currentUserId={userId}
                            />
                          </StopCommentsToggle>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Ornamental break */}
      <div
        className="mx-auto mt-16 max-w-3xl select-none px-6 text-center font-serif text-2xl text-ink/25"
        aria-hidden="true"
      >
        ❦
      </div>

      {/* Discussion */}
      <section
        id="discussion"
        className="mx-auto mt-8 max-w-3xl scroll-mt-6 px-6"
      >
        <div className="flex items-baseline gap-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
            La discussione
          </p>
          <span className="text-ink/25" aria-hidden="true">·</span>
          <p className="font-serif text-base italic text-ink/60">
            talking points
          </p>
        </div>
        <div className="mt-6">
          <CommentThread
            targetType="itinerary"
            targetId={itinerary.id}
            initialRows={itineraryComments}
            currentUserId={userId}
          />
        </div>
      </section>

      {stopRows.length > 0 && (
        <footer className="mx-auto mt-16 max-w-3xl px-6 pb-10 text-center font-serif text-sm italic text-ink/55">
          {stopRows.length} {stopRows.length === 1 ? "stop" : "stops"} ·{" "}
          {dayNumbers.length}{" "}
          {dayNumbers.length === 1 ? "day" : "days"}
          {stopRows[0].arriveDate && (
            <> · leaving {formatDay(stopRows[0].arriveDate)}</>
          )}
        </footer>
      )}
    </main>
  );
}
