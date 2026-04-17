import { and, eq, sql } from "drizzle-orm";
import { db, suggestions, users, votes, comments, stops } from "@/db";

export type SuggestionRow = {
  id: number;
  stopId: number;
  userId: number;
  kind: string;
  title: string;
  url: string | null;
  notes: string | null;
  isConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorName: string | null;
  voteCount: number;
  userHasVoted: boolean;
  commentCount: number;
};

/**
 * Suggestions for a stop, with author + per-user vote flag + vote/comment counts.
 *
 * One round-trip with three joins:
 *   - inner join users (author always present, FK)
 *   - left join votes (target_type='suggestion' on suggestion.id)
 *   - left join comments (target_type='suggestion' on suggestion.id)
 *   group by suggestion.id, users.id; counts aggregated per row.
 *
 * Ordering applied in JS: confirmed first (newest updated first), then
 * unconfirmed by votes desc, created_at desc.
 */
export async function getSuggestionsForStop(
  stopId: number,
  userId: number | null,
): Promise<SuggestionRow[]> {
  const cmpId = userId ?? -1;
  const rows = await db
    .select({
      id: suggestions.id,
      stopId: suggestions.stopId,
      userId: suggestions.userId,
      kind: suggestions.kind,
      title: suggestions.title,
      url: suggestions.url,
      notes: suggestions.notes,
      isConfirmed: suggestions.isConfirmed,
      createdAt: suggestions.createdAt,
      updatedAt: suggestions.updatedAt,
      authorName: users.name,
      voteCount: sql<number>`count(distinct ${votes.id})::int`,
      userHasVoted: sql<boolean>`coalesce(bool_or(${votes.userId} = ${cmpId}), false)`,
      commentCount: sql<number>`count(distinct ${comments.id})::int`,
    })
    .from(suggestions)
    .innerJoin(users, eq(users.id, suggestions.userId))
    .leftJoin(
      votes,
      and(eq(votes.targetType, "suggestion"), eq(votes.targetId, suggestions.id)),
    )
    .leftJoin(
      comments,
      and(
        eq(comments.targetType, "suggestion"),
        eq(comments.targetId, suggestions.id),
      ),
    )
    .where(eq(suggestions.stopId, stopId))
    .groupBy(suggestions.id, users.id);

  return sortSuggestions(rows);
}

function sortSuggestions(rows: SuggestionRow[]): SuggestionRow[] {
  // Per-bucket ordering — different rules for confirmed vs wishlist.
  return rows.sort((a, b) => {
    if (a.isConfirmed !== b.isConfirmed) return a.isConfirmed ? -1 : 1;
    if (a.isConfirmed) {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * All suggestions for every stop in an itinerary, in one query.
 * Avoids N+1 per-stop fetches on the detail page. Join through stops
 * to scope by itinerary_id (no IN-list on polymorphic ids).
 * Returns a Map keyed by stopId, each entry sorted per-bucket.
 */
export async function getSuggestionsForItinerary(
  itineraryId: number,
  userId: number | null,
): Promise<Map<number, SuggestionRow[]>> {
  const cmpId = userId ?? -1;
  const rows = await db
    .select({
      id: suggestions.id,
      stopId: suggestions.stopId,
      userId: suggestions.userId,
      kind: suggestions.kind,
      title: suggestions.title,
      url: suggestions.url,
      notes: suggestions.notes,
      isConfirmed: suggestions.isConfirmed,
      createdAt: suggestions.createdAt,
      updatedAt: suggestions.updatedAt,
      authorName: users.name,
      voteCount: sql<number>`count(distinct ${votes.id})::int`,
      userHasVoted: sql<boolean>`coalesce(bool_or(${votes.userId} = ${cmpId}), false)`,
      commentCount: sql<number>`count(distinct ${comments.id})::int`,
    })
    .from(suggestions)
    .innerJoin(users, eq(users.id, suggestions.userId))
    .innerJoin(stops, eq(stops.id, suggestions.stopId))
    .leftJoin(
      votes,
      and(eq(votes.targetType, "suggestion"), eq(votes.targetId, suggestions.id)),
    )
    .leftJoin(
      comments,
      and(eq(comments.targetType, "suggestion"), eq(comments.targetId, suggestions.id)),
    )
    .where(eq(stops.itineraryId, itineraryId))
    .groupBy(suggestions.id, users.id);

  const byStop = new Map<number, SuggestionRow[]>();
  for (const r of rows) {
    const arr = byStop.get(r.stopId) ?? [];
    arr.push(r);
    byStop.set(r.stopId, arr);
  }
  for (const [, arr] of byStop) sortSuggestions(arr);
  return byStop;
}
