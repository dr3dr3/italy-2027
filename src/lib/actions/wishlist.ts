"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, wishlistDestinations } from "@/db";
import type { ActionResult } from "./comments";

const MAX_NAME = 200;
const MAX_DESCRIPTION = 1000;

function parseCoord(raw: string | undefined, min: number, max: number): string | null | "invalid" {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < min || n > max) return "invalid";
  return String(n);
}

export async function createWishlistDestination(
  name: string,
  description?: string,
  lat?: string,
  lng?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userIdNum = Number(session.user.id);

  const n = name.trim();
  if (n.length === 0) return { ok: false, error: "Name can't be empty." };
  if (n.length > MAX_NAME) {
    return { ok: false, error: `Name is too long (max ${MAX_NAME}).` };
  }

  let cleanedDescription: string | null = null;
  if (description && description.trim().length > 0) {
    const d = description.trim();
    if (d.length > MAX_DESCRIPTION) {
      return { ok: false, error: `Description is too long (max ${MAX_DESCRIPTION}).` };
    }
    cleanedDescription = d;
  }

  const latParsed = parseCoord(lat, -90, 90);
  if (latParsed === "invalid") return { ok: false, error: "Latitude doesn't look valid." };
  const lngParsed = parseCoord(lng, -180, 180);
  if (lngParsed === "invalid") return { ok: false, error: "Longitude doesn't look valid." };
  // Both or neither — half a coordinate is useless.
  if ((latParsed === null) !== (lngParsed === null)) {
    return { ok: false, error: "Give both lat and lng, or neither." };
  }

  await db.insert(wishlistDestinations).values({
    addedBy: userIdNum,
    name: n,
    description: cleanedDescription,
    lat: latParsed,
    lng: lngParsed,
  });

  revalidatePath("/");
  return { ok: true };
}

async function setWishlistStatus(
  id: number,
  status: "pending" | "passed",
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  if (!session.user.isEditor) {
    return { ok: false, error: "Only editors can change wishlist status." };
  }

  const [existing] = await db
    .select({ id: wishlistDestinations.id })
    .from(wishlistDestinations)
    .where(eq(wishlistDestinations.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Wishlist entry not found." };

  await db.update(wishlistDestinations).set({ status }).where(eq(wishlistDestinations.id, id));
  revalidatePath("/");
  return { ok: true };
}

export async function passWishlistDestination(id: number): Promise<ActionResult> {
  return setWishlistStatus(id, "passed");
}

export async function restoreWishlistDestination(id: number): Promise<ActionResult> {
  return setWishlistStatus(id, "pending");
}

export async function deleteWishlistDestination(id: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userIdNum = Number(session.user.id);
  const isEditor = Boolean(session.user.isEditor);

  const [existing] = await db
    .select({ id: wishlistDestinations.id, addedBy: wishlistDestinations.addedBy })
    .from(wishlistDestinations)
    .where(eq(wishlistDestinations.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Wishlist entry not found." };

  if (existing.addedBy !== userIdNum && !isEditor) {
    return { ok: false, error: "Not yours to delete." };
  }

  // Same single-statement cascade pattern as deleteSuggestion — polymorphic
  // comments/votes have no FK, so clean them up alongside the row.
  await db.execute(sql`
    WITH del_comments AS (
      DELETE FROM "comments"
      WHERE "target_type" = 'wishlist_destination' AND "target_id" = ${id}
    ),
    del_votes AS (
      DELETE FROM "votes"
      WHERE "target_type" = 'wishlist_destination' AND "target_id" = ${id}
    )
    DELETE FROM "wishlist_destinations" WHERE "id" = ${id}
  `);

  revalidatePath("/");
  return { ok: true };
}
