"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import {
  db,
  itineraries,
  stops,
  visits,
  wishlistDestinations,
} from "@/db";
import { slugify } from "@/lib/import";
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

function parseRequiredCoord(
  raw: string | undefined,
  min: number,
  max: number,
  label: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const t = (raw ?? "").trim();
  if (t.length === 0) return { ok: false, error: `${label} is required.` };
  const n = Number(t);
  if (!Number.isFinite(n) || n < min || n > max) {
    return { ok: false, error: `${label} doesn't look valid.` };
  }
  return { ok: true, value: String(n) };
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export type PromoteToStopInput = {
  wishlistId: number;
  itineraryId: number;
  name: string;
  description?: string;
  lat: string;
  lng: string;
  day: number;
  orderInDay: number;
  arriveDate: string;
  departDate: string;
};

export async function promoteWishlistToStop(
  input: PromoteToStopInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  if (!session.user.isEditor) {
    return { ok: false, error: "Only editors can promote to a stop." };
  }

  const name = input.name.trim();
  if (name.length === 0) return { ok: false, error: "Name can't be empty." };

  const lat = parseRequiredCoord(input.lat, -90, 90, "Latitude");
  if (!lat.ok) return lat;
  const lng = parseRequiredCoord(input.lng, -180, 180, "Longitude");
  if (!lng.ok) return lng;

  if (!Number.isInteger(input.day) || input.day < 1) {
    return { ok: false, error: "Day must be a positive integer." };
  }
  if (!Number.isInteger(input.orderInDay) || input.orderInDay < 1) {
    return { ok: false, error: "Order must be a positive integer." };
  }

  if (!isIsoDate(input.arriveDate)) {
    return { ok: false, error: "Arrive date must be YYYY-MM-DD." };
  }
  if (!isIsoDate(input.departDate)) {
    return { ok: false, error: "Depart date must be YYYY-MM-DD." };
  }
  if (input.arriveDate > input.departDate) {
    return { ok: false, error: "Arrive date must be on or before depart." };
  }

  const [wish] = await db
    .select({ id: wishlistDestinations.id, status: wishlistDestinations.status })
    .from(wishlistDestinations)
    .where(eq(wishlistDestinations.id, input.wishlistId))
    .limit(1);
  if (!wish) return { ok: false, error: "Wishlist entry not found." };
  if (wish.status !== "pending") {
    return { ok: false, error: "That wishlist entry has already been handled." };
  }

  const [it] = await db
    .select({ id: itineraries.id, slug: itineraries.slug, status: itineraries.status })
    .from(itineraries)
    .where(eq(itineraries.id, input.itineraryId))
    .limit(1);
  if (!it) return { ok: false, error: "Itinerary not found." };
  if (it.status !== "draft" && it.status !== "active") {
    return { ok: false, error: "Can only add stops to draft or active itineraries." };
  }

  const placeKey = slugify(name);
  if (placeKey.length === 0) {
    return { ok: false, error: "Name doesn't slugify to anything." };
  }

  const [clash] = await db
    .select({ id: stops.id })
    .from(stops)
    .where(
      and(eq(stops.itineraryId, it.id), eq(stops.placeKey, placeKey)),
    )
    .limit(1);
  if (clash) {
    return {
      ok: false,
      error: `A stop with place-key "${placeKey}" already exists in this itinerary.`,
    };
  }

  await db.insert(stops).values({
    itineraryId: it.id,
    day: input.day,
    orderInDay: input.orderInDay,
    name,
    placeKey,
    description: input.description?.trim() || null,
    lat: lat.value,
    lng: lng.value,
    arriveDate: input.arriveDate,
    departDate: input.departDate,
  });

  await db
    .update(wishlistDestinations)
    .set({ status: "promoted" })
    .where(eq(wishlistDestinations.id, input.wishlistId));

  revalidatePath("/");
  revalidatePath(`/itineraries/${it.slug}`);
  return { ok: true };
}

export type PromoteToVisitInput = {
  wishlistId: number;
  stopId: number;
  kind: "daytrip" | "enroute";
  name: string;
  description?: string;
  lat: string;
  lng: string;
  visitDate?: string;
};

export async function promoteWishlistToVisit(
  input: PromoteToVisitInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  if (!session.user.isEditor) {
    return { ok: false, error: "Only editors can promote to a visit." };
  }

  if (input.kind !== "daytrip" && input.kind !== "enroute") {
    return { ok: false, error: "Pick daytrip or enroute." };
  }

  const name = input.name.trim();
  if (name.length === 0) return { ok: false, error: "Name can't be empty." };

  const lat = parseRequiredCoord(input.lat, -90, 90, "Latitude");
  if (!lat.ok) return lat;
  const lng = parseRequiredCoord(input.lng, -180, 180, "Longitude");
  if (!lng.ok) return lng;

  if (input.visitDate !== undefined && input.visitDate.length > 0 && !isIsoDate(input.visitDate)) {
    return { ok: false, error: "Visit date must be YYYY-MM-DD." };
  }

  const [wish] = await db
    .select({ id: wishlistDestinations.id, status: wishlistDestinations.status })
    .from(wishlistDestinations)
    .where(eq(wishlistDestinations.id, input.wishlistId))
    .limit(1);
  if (!wish) return { ok: false, error: "Wishlist entry not found." };
  if (wish.status !== "pending") {
    return { ok: false, error: "That wishlist entry has already been handled." };
  }

  const [anchor] = await db
    .select({
      id: stops.id,
      itineraryId: stops.itineraryId,
      day: stops.day,
      orderInDay: stops.orderInDay,
    })
    .from(stops)
    .where(eq(stops.id, input.stopId))
    .limit(1);
  if (!anchor) return { ok: false, error: "Anchor stop not found." };

  if (input.kind === "enroute") {
    // Enroute visits can't hang off the final stop of the itinerary — there's
    // no next leg to put them on. Find the max (day, order_in_day) and
    // compare.
    const [tail] = await db
      .select({ day: stops.day, orderInDay: stops.orderInDay })
      .from(stops)
      .where(eq(stops.itineraryId, anchor.itineraryId))
      .orderBy(desc(stops.day), desc(stops.orderInDay))
      .limit(1);
    if (tail && tail.day === anchor.day && tail.orderInDay === anchor.orderInDay) {
      return {
        ok: false,
        error: "Enroute visits can't attach to the final stop.",
      };
    }
  }

  // orderInLeg: auto-increment per (stopId, kind='enroute'); daytrips leave at 0.
  let orderInLeg = 0;
  if (input.kind === "enroute") {
    const [max] = await db
      .select({ m: sql<number>`coalesce(max(${visits.orderInLeg}), -1)::int` })
      .from(visits)
      .where(and(eq(visits.stopId, anchor.id), eq(visits.kind, "enroute")));
    orderInLeg = (max?.m ?? -1) + 1;
  }

  await db.insert(visits).values({
    stopId: anchor.id,
    kind: input.kind,
    name,
    description: input.description?.trim() || null,
    lat: lat.value,
    lng: lng.value,
    visitDate: input.visitDate && input.visitDate.length > 0 ? input.visitDate : null,
    orderInLeg,
  });

  await db
    .update(wishlistDestinations)
    .set({ status: "promoted" })
    .where(eq(wishlistDestinations.id, input.wishlistId));

  const [parent] = await db
    .select({ slug: itineraries.slug })
    .from(itineraries)
    .where(eq(itineraries.id, anchor.itineraryId))
    .limit(1);

  revalidatePath("/");
  if (parent?.slug) revalidatePath(`/itineraries/${parent.slug}`);
  return { ok: true };
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
