import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
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
import { ItineraryMapLoader } from "@/components/map/itinerary-map-loader";
import type { MapStop } from "@/components/map/itinerary-map";
import { ItineraryStatusControl } from "@/components/itineraries/itinerary-status-control";

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
  ]);

  const days = groupByDay(stopRows);
  const dayNumbers = [...days.keys()].sort((a, b) => a - b);

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

  return (
    <main className="min-h-screen bg-cream text-ink px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Le opzioni
        </Link>

        <header className="mt-6 mb-10 flex items-start justify-between gap-4">
          <h1 className="font-serif text-4xl font-semibold">
            {itinerary.title}
          </h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={itinerary.status} />
            {isEditor && (
              <ItineraryStatusControl
                itineraryId={itinerary.id}
                status={itinerary.status as "draft" | "active" | "archived"}
              />
            )}
            <VoteButton
              targetType="itinerary"
              targetId={itinerary.id}
              count={itineraryVote.count}
              userHasVoted={itineraryVote.userHasVoted}
              label={itinerary.title}
            />
          </div>
        </header>

        <section className="mb-10">
          <h2 className="font-serif text-2xl font-semibold">
            La mappa{" "}
            <span className="text-ink/40 text-xl font-normal">/ the map</span>
          </h2>
          <div className="mt-4">
            {mapStops.length > 0 ? (
              <ItineraryMapLoader stops={mapStops} />
            ) : (
              <p className="text-sm text-ink/50">
                No coordinates on any stops yet.
              </p>
            )}
          </div>
        </section>

        <h2 className="font-serif text-2xl font-semibold">
          Il piano{" "}
          <span className="text-ink/40 text-xl font-normal">/ the plan</span>
        </h2>

        <ol className="mt-6 space-y-8">
          {dayNumbers.map((day) => {
            const dayStops = days.get(day)!;
            const firstArrive = dayStops[0].arriveDate;
            return (
              <li key={day}>
                <h3 className="font-serif text-xl font-semibold text-ink/80">
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
                        className="rounded-lg border border-dust bg-white/60 p-5 scroll-mt-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-serif text-xl font-semibold">
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

        <section className="mt-16">
          <h2 className="font-serif text-2xl font-semibold">
            La discussione{" "}
            <span className="text-ink/40 text-xl font-normal">
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
      </div>
    </main>
  );
}
