import { and, asc, eq, sql } from "drizzle-orm";
import { db, comments, users, stops, suggestions } from "@/db";
import type { TargetType } from "@/lib/polymorphic";

/** @deprecated use TargetType from @/lib/polymorphic */
export type CommentTargetType = TargetType;

export type CommentRow = {
  id: number;
  body: string;
  createdAt: Date;
  userId: number;
  userName: string | null;
};

/**
 * Comments for a polymorphic target, joined to the author, oldest first.
 * Conversational order: the form sits at the bottom.
 */
export async function getCommentsFor(
  targetType: CommentTargetType,
  targetId: number,
): Promise<CommentRow[]> {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      userName: users.name,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(
      and(
        eq(comments.targetType, targetType),
        eq(comments.targetId, targetId),
      ),
    )
    .orderBy(asc(comments.createdAt));
}

/**
 * All stop-level comments for an itinerary in one query, keyed by stopId.
 * Avoids N+1 when every stop card eagerly renders a CommentThread.
 */
export async function getStopCommentsForItinerary(
  itineraryId: number,
): Promise<Map<number, CommentRow[]>> {
  const rows = await db
    .select({
      stopId: comments.targetId,
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      userName: users.name,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .innerJoin(stops, eq(stops.id, comments.targetId))
    .where(
      and(
        eq(comments.targetType, "stop"),
        eq(stops.itineraryId, itineraryId),
      ),
    )
    .orderBy(asc(comments.createdAt));
  const byStop = new Map<number, CommentRow[]>();
  for (const r of rows) {
    const { stopId, ...comment } = r;
    const arr = byStop.get(stopId) ?? [];
    arr.push(comment);
    byStop.set(stopId, arr);
  }
  return byStop;
}

/**
 * All suggestion-level comments for an itinerary, keyed by suggestionId.
 * Join through suggestions → stops to scope by itinerary.
 */
export async function getSuggestionCommentsForItinerary(
  itineraryId: number,
): Promise<Map<number, CommentRow[]>> {
  const rows = await db
    .select({
      suggestionId: comments.targetId,
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      userName: users.name,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .innerJoin(suggestions, eq(suggestions.id, comments.targetId))
    .innerJoin(stops, eq(stops.id, suggestions.stopId))
    .where(
      and(
        eq(comments.targetType, "suggestion"),
        eq(stops.itineraryId, itineraryId),
      ),
    )
    .orderBy(asc(comments.createdAt));
  const bySuggestion = new Map<number, CommentRow[]>();
  for (const r of rows) {
    const { suggestionId, ...comment } = r;
    const arr = bySuggestion.get(suggestionId) ?? [];
    arr.push(comment);
    bySuggestion.set(suggestionId, arr);
  }
  return bySuggestion;
}

/**
 * Stop-comment counts for every stop of a given itinerary.
 * Join via stops so we avoid an IN / ANY clause on the polymorphic target_id
 * (drizzle-orm's inArray serialised awkwardly against the neon-http driver).
 */
export async function getStopCommentCountsForItinerary(
  itineraryId: number,
): Promise<Map<number, number>> {
  const rows = await db
    .select({
      stopId: comments.targetId,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .innerJoin(stops, eq(stops.id, comments.targetId))
    .where(
      and(
        eq(comments.targetType, "stop"),
        eq(stops.itineraryId, itineraryId),
      ),
    )
    .groupBy(comments.targetId);
  return new Map(rows.map((r) => [r.stopId, r.count]));
}
