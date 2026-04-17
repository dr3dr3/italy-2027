import { and, eq, sql } from "drizzle-orm";
import { db, votes, stops, itineraries } from "@/db";
import type { TargetType } from "@/lib/polymorphic";

export type VoteSummary = { count: number; userHasVoted: boolean };

/**
 * Count + per-user flag for a single target.
 * Single SQL round-trip via bool_or over a filter.
 */
export async function getVoteSummaryFor(
  targetType: TargetType,
  targetId: number,
  userId: number | null,
): Promise<VoteSummary> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      userHasVoted: userId === null
        ? sql<boolean>`false`
        : sql<boolean>`bool_or(${votes.userId} = ${userId})`,
    })
    .from(votes)
    .where(
      and(
        eq(votes.targetType, targetType),
        eq(votes.targetId, targetId),
      ),
    );
  return {
    count: row?.count ?? 0,
    userHasVoted: row?.userHasVoted ?? false,
  };
}

export async function getItineraryVoteSummary(
  itineraryId: number,
  userId: number | null,
): Promise<VoteSummary> {
  return getVoteSummaryFor("itinerary", itineraryId, userId);
}

/**
 * Vote summaries for every stop of an itinerary. Joined through stops so
 * we never need an IN-list on the polymorphic target_id (see the neon-http /
 * drizzle `inArray` -> `ANY((tuple))` gotcha from Phase 2.1).
 */
export async function getStopVoteSummariesForItinerary(
  itineraryId: number,
  userId: number | null,
): Promise<Map<number, VoteSummary>> {
  const rows = await db
    .select({
      stopId: votes.targetId,
      count: sql<number>`count(*)::int`,
      userHasVoted: userId === null
        ? sql<boolean>`false`
        : sql<boolean>`bool_or(${votes.userId} = ${userId})`,
    })
    .from(votes)
    .innerJoin(stops, eq(stops.id, votes.targetId))
    .where(
      and(
        eq(votes.targetType, "stop"),
        eq(stops.itineraryId, itineraryId),
      ),
    )
    .groupBy(votes.targetId);
  return new Map(
    rows.map((r) => [r.stopId, { count: r.count, userHasVoted: r.userHasVoted }]),
  );
}

/**
 * Vote summaries for a list of itineraries in one query.
 * Join through itineraries (filtered by status) rather than IN-listing ids.
 */
export async function getItineraryVoteSummariesForUser(
  itineraryIds: number[],
  userId: number | null,
): Promise<Map<number, VoteSummary>> {
  if (itineraryIds.length === 0) return new Map();
  // Join to itineraries, group by itinerary.id. We still need *some* filter
  // so Postgres doesn't scan the whole itineraries table. Easiest: filter by
  // the calling page's status (active) — the list view is the only caller
  // that uses this, and it only shows active rows.
  const rows = await db
    .select({
      itineraryId: votes.targetId,
      count: sql<number>`count(*)::int`,
      userHasVoted: userId === null
        ? sql<boolean>`false`
        : sql<boolean>`bool_or(${votes.userId} = ${userId})`,
    })
    .from(votes)
    .innerJoin(itineraries, eq(itineraries.id, votes.targetId))
    .where(
      and(
        eq(votes.targetType, "itinerary"),
        eq(itineraries.status, "active"),
      ),
    )
    .groupBy(votes.targetId);
  // Filter client-side to the requested ids — the server already restricted
  // by status, and itineraryIds is always small.
  const wanted = new Set(itineraryIds);
  return new Map(
    rows
      .filter((r) => wanted.has(r.itineraryId))
      .map((r) => [
        r.itineraryId,
        { count: r.count, userHasVoted: r.userHasVoted },
      ]),
  );
}
