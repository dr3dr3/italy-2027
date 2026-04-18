import { and, eq, sql } from "drizzle-orm";
import {
  db,
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
