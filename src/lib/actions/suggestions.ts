"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, suggestions, stops, itineraries, visits } from "@/db";
import { assertTargetExists } from "@/lib/polymorphic";
import type { ActionResult } from "./comments";

const KINDS = ["attraction", "restaurant", "sight", "other"] as const;
export type SuggestionKind = (typeof KINDS)[number];

const MAX_TITLE = 200;
const MAX_NOTES = 1000;

function validateUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function createSuggestion(
  stopId: number,
  kind: string,
  title: string,
  url?: string,
  notes?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userIdNum = Number(session.user.id);

  if (!KINDS.includes(kind as SuggestionKind)) {
    return { ok: false, error: "Pick a valid kind." };
  }
  const t = title.trim();
  if (t.length === 0) return { ok: false, error: "Title can't be empty." };
  if (t.length > MAX_TITLE)
    return { ok: false, error: `Title is too long (max ${MAX_TITLE}).` };

  let cleanedUrl: string | null = null;
  if (url && url.trim().length > 0) {
    cleanedUrl = validateUrl(url.trim());
    if (cleanedUrl === null) {
      return { ok: false, error: "URL doesn't look valid." };
    }
  }

  let cleanedNotes: string | null = null;
  if (notes && notes.trim().length > 0) {
    const n = notes.trim();
    if (n.length > MAX_NOTES) {
      return { ok: false, error: `Notes are too long (max ${MAX_NOTES}).` };
    }
    cleanedNotes = n;
  }

  const target = await assertTargetExists("stop", stopId);
  if (!target.ok) return target;

  await db.insert(suggestions).values({
    stopId,
    userId: userIdNum,
    kind,
    title: t,
    url: cleanedUrl,
    notes: cleanedNotes,
  });

  for (const path of target.revalidatePaths) revalidatePath(path);
  return { ok: true };
}

export async function deleteSuggestion(
  suggestionId: number,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userIdNum = Number(session.user.id);
  const isEditor = Boolean(session.user.isEditor);

  const [existing] = await db
    .select({
      id: suggestions.id,
      userId: suggestions.userId,
      stopId: suggestions.stopId,
    })
    .from(suggestions)
    .where(eq(suggestions.id, suggestionId))
    .limit(1);
  if (!existing) return { ok: false, error: "Suggestion not found." };

  if (existing.userId !== userIdNum && !isEditor) {
    return { ok: false, error: "Not yours to delete." };
  }

  // Resolve the parent itinerary slug now so we can revalidate after the cascade.
  const [parent] = await db
    .select({ slug: itineraries.slug })
    .from(stops)
    .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
    .where(eq(stops.id, existing.stopId))
    .limit(1);

  // Cascade as one atomic statement via CTEs. neon-http is single-statement-per-
  // request, so a real .transaction() isn't available — but a single SQL
  // statement is still atomic. Comments + votes pointing at this suggestion
  // have no FK (polymorphic), so we clean them up by hand.
  await db.execute(sql`
    WITH del_comments AS (
      DELETE FROM "comments"
      WHERE "target_type" = 'suggestion' AND "target_id" = ${suggestionId}
    ),
    del_votes AS (
      DELETE FROM "votes"
      WHERE "target_type" = 'suggestion' AND "target_id" = ${suggestionId}
    )
    DELETE FROM "suggestions" WHERE "id" = ${suggestionId}
  `);

  if (parent?.slug) revalidatePath(`/itineraries/${parent.slug}`);
  return { ok: true };
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

export type ConvertSuggestionToVisitInput = {
  suggestionId: number;
  kind: "daytrip" | "enroute";
  name: string;
  description?: string;
  lat: string;
  lng: string;
  visitDate?: string;
};

export async function convertSuggestionToVisit(
  input: ConvertSuggestionToVisitInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  if (!session.user.isEditor) {
    return { ok: false, error: "Only editors can convert a suggestion." };
  }

  if (input.kind !== "daytrip" && input.kind !== "enroute") {
    return { ok: false, error: "Pick daytrip or enroute." };
  }

  const name = input.name.trim();
  if (name.length === 0) return { ok: false, error: "Name can't be empty." };
  if (name.length > MAX_TITLE) {
    return { ok: false, error: `Name is too long (max ${MAX_TITLE}).` };
  }

  const lat = parseRequiredCoord(input.lat, -90, 90, "Latitude");
  if (!lat.ok) return lat;
  const lng = parseRequiredCoord(input.lng, -180, 180, "Longitude");
  if (!lng.ok) return lng;

  if (
    input.visitDate !== undefined &&
    input.visitDate.length > 0 &&
    !isIsoDate(input.visitDate)
  ) {
    return { ok: false, error: "Visit date must be YYYY-MM-DD." };
  }

  const [existing] = await db
    .select({ id: suggestions.id, stopId: suggestions.stopId })
    .from(suggestions)
    .where(eq(suggestions.id, input.suggestionId))
    .limit(1);
  if (!existing) return { ok: false, error: "Suggestion not found." };

  const [anchor] = await db
    .select({
      id: stops.id,
      itineraryId: stops.itineraryId,
      day: stops.day,
      orderInDay: stops.orderInDay,
    })
    .from(stops)
    .where(eq(stops.id, existing.stopId))
    .limit(1);
  if (!anchor) return { ok: false, error: "Anchor stop not found." };

  if (input.kind === "enroute") {
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

  let orderInLeg = 0;
  if (input.kind === "enroute") {
    const [max] = await db
      .select({ m: sql<number>`coalesce(max(${visits.orderInLeg}), -1)::int` })
      .from(visits)
      .where(and(eq(visits.stopId, anchor.id), eq(visits.kind, "enroute")));
    orderInLeg = (max?.m ?? -1) + 1;
  }

  const description = input.description?.trim();
  const descriptionValue = description && description.length > 0 ? description : null;
  const visitDateValue =
    input.visitDate && input.visitDate.length > 0 ? input.visitDate : null;

  // One statement: insert the visit, re-point polymorphic comments + votes
  // from the suggestion to the new visit, then delete the suggestion.
  // neon-http has no .transaction(), but a single SQL statement is atomic.
  await db.execute(sql`
    WITH new_visit AS (
      INSERT INTO "visits"
        ("stop_id", "kind", "name", "description", "lat", "lng", "visit_date", "order_in_leg")
      VALUES (
        ${anchor.id},
        ${input.kind},
        ${name},
        ${descriptionValue},
        ${lat.value},
        ${lng.value},
        ${visitDateValue}::date,
        ${orderInLeg}
      )
      RETURNING id
    ),
    upd_comments AS (
      UPDATE "comments"
      SET "target_type" = 'visit', "target_id" = (SELECT id FROM new_visit)
      WHERE "target_type" = 'suggestion' AND "target_id" = ${input.suggestionId}
    ),
    upd_votes AS (
      UPDATE "votes"
      SET "target_type" = 'visit', "target_id" = (SELECT id FROM new_visit)
      WHERE "target_type" = 'suggestion' AND "target_id" = ${input.suggestionId}
    )
    DELETE FROM "suggestions" WHERE "id" = ${input.suggestionId}
  `);

  const [parent] = await db
    .select({ slug: itineraries.slug })
    .from(itineraries)
    .where(eq(itineraries.id, anchor.itineraryId))
    .limit(1);
  if (parent?.slug) revalidatePath(`/itineraries/${parent.slug}`);
  return { ok: true };
}

export async function toggleSuggestionConfirmed(
  suggestionId: number,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  if (!session.user.isEditor) {
    return { ok: false, error: "Only editors can confirm suggestions." };
  }

  const [existing] = await db
    .select({
      id: suggestions.id,
      isConfirmed: suggestions.isConfirmed,
      stopId: suggestions.stopId,
    })
    .from(suggestions)
    .where(eq(suggestions.id, suggestionId))
    .limit(1);
  if (!existing) return { ok: false, error: "Suggestion not found." };

  await db
    .update(suggestions)
    .set({ isConfirmed: !existing.isConfirmed, updatedAt: new Date() })
    .where(eq(suggestions.id, suggestionId));

  const [parent] = await db
    .select({ slug: itineraries.slug })
    .from(stops)
    .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
    .where(eq(stops.id, existing.stopId))
    .limit(1);
  if (parent?.slug) revalidatePath(`/itineraries/${parent.slug}`);
  return { ok: true };
}
