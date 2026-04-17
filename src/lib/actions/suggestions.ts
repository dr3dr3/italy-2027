"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, suggestions, stops, itineraries } from "@/db";
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

  revalidatePath(`/itineraries/${target.itinerarySlug}`);
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
