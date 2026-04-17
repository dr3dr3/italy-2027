import { eq } from "drizzle-orm";
import { db, itineraries, stops, suggestions } from "@/db";

export type TargetType = "itinerary" | "stop" | "suggestion";

export type TargetCheck =
  | { ok: true; itinerarySlug: string }
  | { ok: false; error: string };

/**
 * Validate that a polymorphic target row exists, and return the parent
 * itinerary slug for `revalidatePath`. `target_id` has no FK by design,
 * so every polymorphic writer needs this check.
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
      ? { ok: true, itinerarySlug: row.slug }
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
      ? { ok: true, itinerarySlug: row.slug }
      : { ok: false, error: "Stop not found." };
  }

  if (targetType === "suggestion") {
    // Suggestions -> stops -> itineraries. Wired up in Phase 2.3.
    const [row] = await db
      .select({ slug: itineraries.slug })
      .from(suggestions)
      .innerJoin(stops, eq(stops.id, suggestions.stopId))
      .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
      .where(eq(suggestions.id, targetId))
      .limit(1);
    return row
      ? { ok: true, itinerarySlug: row.slug }
      : { ok: false, error: "Suggestion not found." };
  }

  return { ok: false, error: "Unknown target type." };
}
