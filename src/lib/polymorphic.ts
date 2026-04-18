import { eq } from "drizzle-orm";
import {
  db,
  itineraries,
  stops,
  suggestions,
  visits,
  wishlistDestinations,
} from "@/db";

export type TargetType =
  | "itinerary"
  | "stop"
  | "suggestion"
  | "visit"
  | "wishlist_destination";

export type TargetCheck =
  | { ok: true; revalidatePaths: string[] }
  | { ok: false; error: string };

/**
 * Validate that a polymorphic target row exists, and return the paths that
 * should be revalidated after a write. `target_id` has no FK by design,
 * so every polymorphic writer needs this check. Wishlist destinations live
 * on the home page; everything else is itinerary-scoped.
 */
export async function assertTargetExists(
  targetType: TargetType,
  targetId: number,
): Promise<TargetCheck> {
  if (targetType === "itinerary") {
    const [row] = await db
      .select({ slug: itineraries.slug })
      .from(itineraries)
      .where(eq(itineraries.id, targetId))
      .limit(1);
    return row
      ? { ok: true, revalidatePaths: [`/itineraries/${row.slug}`] }
      : { ok: false, error: "Itinerary not found." };
  }

  if (targetType === "stop") {
    const [row] = await db
      .select({ slug: itineraries.slug })
      .from(stops)
      .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
      .where(eq(stops.id, targetId))
      .limit(1);
    return row
      ? { ok: true, revalidatePaths: [`/itineraries/${row.slug}`] }
      : { ok: false, error: "Stop not found." };
  }

  if (targetType === "suggestion") {
    const [row] = await db
      .select({ slug: itineraries.slug })
      .from(suggestions)
      .innerJoin(stops, eq(stops.id, suggestions.stopId))
      .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
      .where(eq(suggestions.id, targetId))
      .limit(1);
    return row
      ? { ok: true, revalidatePaths: [`/itineraries/${row.slug}`] }
      : { ok: false, error: "Suggestion not found." };
  }

  if (targetType === "visit") {
    const [row] = await db
      .select({ slug: itineraries.slug })
      .from(visits)
      .innerJoin(stops, eq(stops.id, visits.stopId))
      .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
      .where(eq(visits.id, targetId))
      .limit(1);
    return row
      ? { ok: true, revalidatePaths: [`/itineraries/${row.slug}`] }
      : { ok: false, error: "Visit not found." };
  }

  if (targetType === "wishlist_destination") {
    const [row] = await db
      .select({ id: wishlistDestinations.id })
      .from(wishlistDestinations)
      .where(eq(wishlistDestinations.id, targetId))
      .limit(1);
    return row
      ? { ok: true, revalidatePaths: ["/"] }
      : { ok: false, error: "Wishlist destination not found." };
  }

  return { ok: false, error: "Unknown target type." };
}
