"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, videos, stops, itineraries } from "@/db";
import { extractYouTubeId } from "@/lib/youtube";
import type { ActionResult } from "./comments";

const MAX_NOTE = 500;

async function slugForStop(stopId: number): Promise<string | null> {
  const [row] = await db
    .select({ slug: itineraries.slug })
    .from(stops)
    .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
    .where(eq(stops.id, stopId))
    .limit(1);
  return row?.slug ?? null;
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

  const slug = await slugForStop(stopId);
  if (slug) revalidatePath(`/itineraries/${slug}`);
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

  await db.delete(videos).where(eq(videos.id, videoId));

  const slug = await slugForStop(existing.stopId);
  if (slug) revalidatePath(`/itineraries/${slug}`);
  return { ok: true };
}
