import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import { db, itineraries, stops } from "@/db";
import { StatusBadge } from "@/components/status-badge";
import { formatDay, formatRange } from "@/lib/dates";
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

  return (
    <main className="min-h-screen text-ink px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="animate-in text-sm text-ink/60 hover:text-ink"
        >
          ← Le opzioni <span className="text-ink/40">/ back</span>
        </Link>

        <header
          className="animate-in mt-6 mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          style={{ animationDelay: "80ms" }}
        >
          <h1 className="font-serif text-4xl font-semibold">
            {itinerary.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <StatusBadge status={itinerary.status} />
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

        <section className="animate-in mb-10" style={{ animationDelay: "160ms" }}>
          <h2 className="font-serif text-2xl font-semibold">
            La mappa{" "}
            <span className="text-ink/50 text-xl font-normal">/ the map</span>
          </h2>
          <div className="mt-4">
            {mapStops.length > 0 ? (
              <ItineraryMapLoader stops={mapStops} visits={mapVisits} />
            ) : (
              <p className="text-sm text-ink/50">
                Somewhere in Italy, probably.
              </p>
            )}
          </div>
        </section>

        <ParticipationsSection
          itineraryId={itinerary.id}
          people={people}
          currentUserId={userId}
          prefill={prefill}
          tripStart={tripStart}
          tripEnd={tripEnd}
        />

        <h2 className="animate-in font-serif text-2xl font-semibold" style={{ animationDelay: "240ms" }}>
          Il piano{" "}
          <span className="text-ink/50 text-xl font-normal">/ the plan</span>
        </h2>

        {dayNumbers.length > 1 && (
          <nav className="animate-in mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink/60" style={{ animationDelay: "300ms" }}>
            {dayNumbers.map((day) => (
              <a
                key={day}
                href={`#day-${day}`}
                className="hover:text-ink"
              >
                Day {day}
              </a>
            ))}
          </nav>
        )}

        <ol className="mt-6 space-y-8">
          {dayNumbers.map((day, i) => {
            const dayStops = days.get(day)!;
            const firstArrive = dayStops[0].arriveDate;
            return (
              <li
                key={day}
                id={`day-${day}`}
                className="animate-in scroll-mt-16 sm:scroll-mt-6"
                style={{ animationDelay: `${360 + i * 80}ms` }}
              >
                <h3 className="font-serif text-2xl font-semibold">
                  Day {day}
                  {firstArrive && (
                    <span className="text-ink/40">
                      {" "}
                      · {formatDay(firstArrive)}
                    </span>
                  )}
                </h3>
                <div className="mt-3 space-y-4">
                  {dayStops.map((s) => {
                    const v = stopVotes.get(s.id) ?? {
                      count: 0,
                      userHasVoted: false,
                    };
                    return (
                      <div
                        key={s.id}
                        id={`stop-${s.id}`}
                        className="rounded-lg border border-dust bg-white/85 p-4 sm:p-5 scroll-mt-16 sm:scroll-mt-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-serif text-lg font-semibold">
                              {s.name}
                            </h4>
                            {s.arriveDate && s.departDate && (
                              <div className="mt-1 text-sm text-ink/60">
                                {formatRange(s.arriveDate, s.departDate)}
                              </div>
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
                          <p className="mt-2 text-base text-ink/80">
                            {s.description}
                          </p>
                        )}
                        <AbsenteePill absentees={absenteesByStop.get(s.id) ?? []} />
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
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>

        <section id="discussion" className="mt-16 scroll-mt-6">
          <h2 className="font-serif text-2xl font-semibold">
            La discussione{" "}
            <span className="text-ink/50 text-xl font-normal">
              / talking points
            </span>
          </h2>
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
          <footer className="mt-12 pb-4 text-center text-sm text-ink/40 font-serif italic">
            {stopRows.length} {stopRows.length === 1 ? "stop" : "stops"} · {dayNumbers.length} {dayNumbers.length === 1 ? "day" : "days"}
            {stopRows[0].arriveDate && (
              <> · leaving {formatDay(stopRows[0].arriveDate)}</>
            )}
          </footer>
        )}
      </div>
    </main>
  );
}
