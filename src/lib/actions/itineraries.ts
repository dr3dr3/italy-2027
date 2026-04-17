"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, itineraries } from "@/db";
import type { ActionResult } from "./comments";

const STATUSES = ["draft", "active", "archived"] as const;
export type ItineraryStatus = (typeof STATUSES)[number];

function isAllowedTransition(from: ItineraryStatus, to: ItineraryStatus): true | string {
  if (from === to) return "That's already the status.";
  // Only disallowed transition: draft → archived.
  if (from === "draft" && to === "archived") {
    return "Drafts can't be archived directly. Activate first.";
  }
  return true;
}

export async function setItineraryStatus(
  itineraryId: number,
  newStatus: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  if (!session.user.isEditor) {
    return { ok: false, error: "Only editors can change itinerary status." };
  }

  if (!STATUSES.includes(newStatus as ItineraryStatus)) {
    return { ok: false, error: "Pick a valid status." };
  }
  const to = newStatus as ItineraryStatus;

  const [existing] = await db
    .select({ id: itineraries.id, slug: itineraries.slug, status: itineraries.status })
    .from(itineraries)
    .where(eq(itineraries.id, itineraryId))
    .limit(1);
  if (!existing) return { ok: false, error: "Itinerary not found." };

  const check = isAllowedTransition(existing.status as ItineraryStatus, to);
  if (check !== true) return { ok: false, error: check };

  await db
    .update(itineraries)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(itineraries.id, itineraryId));

  revalidatePath("/");
  revalidatePath(`/itineraries/${existing.slug}`);
  return { ok: true };
}
