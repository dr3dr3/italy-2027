import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  itineraries,
  stops,
  wishlistDestinations,
  users,
  votes,
  comments,
} from "@/db";

export type WishlistRow = {
  id: number;
  name: string;
  description: string | null;
  lat: string | null;
  lng: string | null;
  status: string;
  createdAt: Date;
  addedBy: number;
  authorName: string | null;
  voteCount: number;
  userHasVoted: boolean;
  commentCount: number;
};

/**
 * Pending wishlist entries with author, vote count + per-user flag, and
 * comment count. Same polymorphic-join shape used by getSuggestionsForStop —
 * one round-trip with left joins on votes and comments, grouped by row.
 *
 * Ordering applied in JS: most-voted first, then newest.
 */
export async function getPendingWishlist(
  userId: number | null,
): Promise<WishlistRow[]> {
  const cmpId = userId ?? -1;
  const rows = await db
    .select({
      id: wishlistDestinations.id,
      name: wishlistDestinations.name,
      description: wishlistDestinations.description,
      lat: wishlistDestinations.lat,
      lng: wishlistDestinations.lng,
      status: wishlistDestinations.status,
      createdAt: wishlistDestinations.createdAt,
      addedBy: wishlistDestinations.addedBy,
      authorName: users.name,
      voteCount: sql<number>`count(distinct ${votes.id})::int`,
      userHasVoted: sql<boolean>`coalesce(bool_or(${votes.userId} = ${cmpId}), false)`,
      commentCount: sql<number>`count(distinct ${comments.id})::int`,
    })
    .from(wishlistDestinations)
    .innerJoin(users, eq(users.id, wishlistDestinations.addedBy))
    .leftJoin(
      votes,
      and(
        eq(votes.targetType, "wishlist_destination"),
        eq(votes.targetId, wishlistDestinations.id),
      ),
    )
    .leftJoin(
      comments,
      and(
        eq(comments.targetType, "wishlist_destination"),
        eq(comments.targetId, wishlistDestinations.id),
      ),
    )
    .where(eq(wishlistDestinations.status, "pending"))
    .groupBy(wishlistDestinations.id, users.id);

  return rows.sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export type PromotionStop = {
  id: number;
  name: string;
  day: number;
  orderInDay: number;
  isLast: boolean;
};

export type PromotionItinerary = {
  id: number;
  title: string;
  slug: string;
  status: string;
  stops: PromotionStop[];
};

/**
 * Every draft|active itinerary with its stops, used to populate the editor's
 * promotion dropdowns. Stops ordered by (day, order_in_day). `isLast` flags
 * the final stop of each itinerary — enroute visits can't attach there
 * because there's no next leg.
 */
export async function getPromotionTargets(): Promise<PromotionItinerary[]> {
  const its = await db
    .select({
      id: itineraries.id,
      title: itineraries.title,
      slug: itineraries.slug,
      status: itineraries.status,
    })
    .from(itineraries)
    .where(inArray(itineraries.status, ["draft", "active"]))
    .orderBy(asc(itineraries.title));

  if (its.length === 0) return [];

  const itIds = its.map((i) => i.id);
  const rows = await db
    .select({
      id: stops.id,
      itineraryId: stops.itineraryId,
      name: stops.name,
      day: stops.day,
      orderInDay: stops.orderInDay,
    })
    .from(stops)
    .where(inArray(stops.itineraryId, itIds))
    .orderBy(asc(stops.day), asc(stops.orderInDay));

  const byIt = new Map<number, PromotionStop[]>();
  for (const s of rows) {
    const arr = byIt.get(s.itineraryId) ?? [];
    arr.push({
      id: s.id,
      name: s.name,
      day: s.day,
      orderInDay: s.orderInDay,
      isLast: false,
    });
    byIt.set(s.itineraryId, arr);
  }
  for (const [, arr] of byIt) {
    if (arr.length > 0) arr[arr.length - 1].isLast = true;
  }

  return its.map((it) => ({ ...it, stops: byIt.get(it.id) ?? [] }));
}
