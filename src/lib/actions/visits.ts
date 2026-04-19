"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, visits, stops, itineraries } from "@/db";
import type { ActionResult } from "./comments";

export async function deleteVisit(visitId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  if (!session.user.isEditor) {
    return { ok: false, error: "Only editors can delete visits." };
  }

  const [row] = await db
    .select({
      id: visits.id,
      stopId: visits.stopId,
    })
    .from(visits)
    .where(eq(visits.id, visitId))
    .limit(1);
  if (!row) return { ok: false, error: "Visit not found." };

  const [parent] = await db
    .select({ slug: itineraries.slug })
    .from(stops)
    .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
    .where(eq(stops.id, row.stopId))
    .limit(1);

  // Same CTE-delete pattern as suggestions/wishlist: drop polymorphic
  // comments + votes in the same statement so they don't leak.
  await db.execute(sql`
    WITH del_comments AS (
      DELETE FROM "comments"
      WHERE "target_type" = 'visit' AND "target_id" = ${visitId}
    ),
    del_votes AS (
      DELETE FROM "votes"
      WHERE "target_type" = 'visit' AND "target_id" = ${visitId}
    )
    DELETE FROM "visits" WHERE "id" = ${visitId}
  `);

  if (parent?.slug) revalidatePath(`/itineraries/${parent.slug}`);
  return { ok: true };
}
