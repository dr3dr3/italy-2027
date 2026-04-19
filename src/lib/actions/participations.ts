"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max, min } from "drizzle-orm";
import { auth } from "@/auth";
import { db, itineraries, participations, stops } from "@/db";
import type { ActionResult } from "./comments";

const MAX_NOTE = 200;

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export type UpsertParticipationInput = {
  itineraryId: number;
  joinsOn: string | null;
  departsOn: string | null;
  note: string | null;
};

export async function upsertParticipation(
  input: UpsertParticipationInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userIdNum = Number(session.user.id);

  const joinsOn = input.joinsOn?.trim() || null;
  const departsOn = input.departsOn?.trim() || null;
  const noteRaw = input.note?.trim() ?? "";

  if (joinsOn !== null && !isIsoDate(joinsOn)) {
    return { ok: false, error: "Join date must be YYYY-MM-DD." };
  }
  if (departsOn !== null && !isIsoDate(departsOn)) {
    return { ok: false, error: "Depart date must be YYYY-MM-DD." };
  }
  if (joinsOn && departsOn && joinsOn > departsOn) {
    return { ok: false, error: "Join date must be on or before depart." };
  }
  if (noteRaw.length > MAX_NOTE) {
    return { ok: false, error: `Note is too long (max ${MAX_NOTE}).` };
  }
  const note = noteRaw.length > 0 ? noteRaw : null;

  const [it] = await db
    .select({ id: itineraries.id, slug: itineraries.slug })
    .from(itineraries)
    .where(eq(itineraries.id, input.itineraryId))
    .limit(1);
  if (!it) return { ok: false, error: "Itinerary not found." };

  const [span] = await db
    .select({
      first: min(stops.arriveDate),
      last: max(stops.departDate),
    })
    .from(stops)
    .where(eq(stops.itineraryId, input.itineraryId));
  if (joinsOn && span?.first && joinsOn < span.first) {
    return { ok: false, error: "Join date is before the trip starts." };
  }
  if (departsOn && span?.last && departsOn > span.last) {
    return { ok: false, error: "Depart date is after the trip ends." };
  }

  // Lookup-then-write, matching the pattern used by toggleVote — trivially
  // correct and avoids leaning on onConflict upsert semantics.
  const [existing] = await db
    .select({ id: participations.id })
    .from(participations)
    .where(
      and(
        eq(participations.itineraryId, input.itineraryId),
        eq(participations.userId, userIdNum),
      ),
    )
    .limit(1);

  const allEmpty = joinsOn === null && departsOn === null && note === null;
  if (allEmpty) {
    if (existing) {
      await db.delete(participations).where(eq(participations.id, existing.id));
    }
  } else if (existing) {
    await db
      .update(participations)
      .set({ joinsOn, departsOn, note, updatedAt: new Date() })
      .where(eq(participations.id, existing.id));
  } else {
    await db.insert(participations).values({
      itineraryId: input.itineraryId,
      userId: userIdNum,
      joinsOn,
      departsOn,
      note,
    });
  }

  revalidatePath(`/itineraries/${it.slug}`);
  return { ok: true };
}

export async function deleteParticipation(
  itineraryId: number,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userIdNum = Number(session.user.id);

  const [it] = await db
    .select({ slug: itineraries.slug })
    .from(itineraries)
    .where(eq(itineraries.id, itineraryId))
    .limit(1);
  if (!it) return { ok: false, error: "Itinerary not found." };

  await db
    .delete(participations)
    .where(
      and(
        eq(participations.itineraryId, itineraryId),
        eq(participations.userId, userIdNum),
      ),
    );

  revalidatePath(`/itineraries/${it.slug}`);
  return { ok: true };
}
