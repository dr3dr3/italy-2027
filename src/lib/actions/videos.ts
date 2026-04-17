"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/auth";
import { db, videos, stops, itineraries } from "@/db";
import { extractYouTubeId } from "@/lib/youtube";
import type { ActionResult } from "./comments";

const MAX_NOTE = 500;

async function slugsForStop(stopId: number): Promise<string[]> {
  const siblings = alias(stops, "sibling_stops");
  const rows = await db
    .select({ slug: itineraries.slug })
    .from(stops)
    .innerJoin(siblings, eq(siblings.placeKey, stops.placeKey))
    .innerJoin(itineraries, eq(itineraries.id, siblings.itineraryId))
    .where(eq(stops.id, stopId));
  return Array.from(new Set(rows.map((r) => r.slug)));
}

export async function createVideo(
  stopId: number,
  youtubeUrl: string,
  note?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userIdNum = Number(session.user.id);

  const videoId = extractYouTubeId(youtubeUrl.trim());
  if (!videoId) {
    return {
      ok: false,
      error: "That doesn't look like a YouTube link. Check the URL?",
    };
  }

  const [stop] = await db
    .select({ id: stops.id })
    .from(stops)
    .where(eq(stops.id, stopId))
    .limit(1);
  if (!stop) return { ok: false, error: "Stop not found." };

  let cleanedNote: string | null = null;
  if (note && note.trim().length > 0) {
    const n = note.trim();
    if (n.length > MAX_NOTE) {
      return { ok: false, error: `Note is too long (max ${MAX_NOTE}).` };
    }
    cleanedNote = n;
  }

  await db.insert(videos).values({
    stopId,
    userId: userIdNum,
    youtubeUrl: youtubeUrl.trim(),
    note: cleanedNote,
  });

  for (const slug of await slugsForStop(stopId)) {
    revalidatePath(`/itineraries/${slug}`);
  }
  return { ok: true };
}

export async function deleteVideo(videoId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userIdNum = Number(session.user.id);
  const isEditor = Boolean(session.user.isEditor);

  const [existing] = await db
    .select({ id: videos.id, userId: videos.userId, stopId: videos.stopId })
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);
  if (!existing) return { ok: false, error: "Video not found." };

  if (existing.userId !== userIdNum && !isEditor) {
    return { ok: false, error: "Not yours to delete." };
  }

  const slugs = await slugsForStop(existing.stopId);
  await db.delete(videos).where(eq(videos.id, videoId));

  for (const slug of slugs) {
    revalidatePath(`/itineraries/${slug}`);
  }
  return { ok: true };
}
