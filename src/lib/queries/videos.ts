import { desc, eq, sql } from "drizzle-orm";
import { db, videos, users, stops } from "@/db";

export type VideoRow = {
  id: number;
  stopId: number;
  youtubeUrl: string;
  note: string | null;
  createdAt: Date;
  userId: number;
  authorName: string | null;
};

export async function getVideosForStop(stopId: number): Promise<VideoRow[]> {
  return db
    .select({
      id: videos.id,
      stopId: videos.stopId,
      youtubeUrl: videos.youtubeUrl,
      note: videos.note,
      createdAt: videos.createdAt,
      userId: videos.userId,
      authorName: users.name,
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.userId))
    .where(eq(videos.stopId, stopId))
    .orderBy(desc(videos.createdAt));
}

/**
 * All videos for every stop of an itinerary, one query.
 * Keyed by stopId, newest first within each stop.
 */
export async function getVideosForItinerary(
  itineraryId: number,
): Promise<Map<number, VideoRow[]>> {
  const rows = await db
    .select({
      id: videos.id,
      stopId: videos.stopId,
      youtubeUrl: videos.youtubeUrl,
      note: videos.note,
      createdAt: videos.createdAt,
      userId: videos.userId,
      authorName: users.name,
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.userId))
    .innerJoin(stops, eq(stops.id, videos.stopId))
    .where(eq(stops.itineraryId, itineraryId))
    .orderBy(desc(videos.createdAt));

  const byStop = new Map<number, VideoRow[]>();
  for (const r of rows) {
    const arr = byStop.get(r.stopId) ?? [];
    arr.push(r);
    byStop.set(r.stopId, arr);
  }
  return byStop;
}

export async function getStopVideoCountsForItinerary(
  itineraryId: number,
): Promise<Map<number, number>> {
  const rows = await db
    .select({
      stopId: videos.stopId,
      count: sql<number>`count(*)::int`,
    })
    .from(videos)
    .innerJoin(stops, eq(stops.id, videos.stopId))
    .where(eq(stops.itineraryId, itineraryId))
    .groupBy(videos.stopId);
  return new Map(rows.map((r) => [r.stopId, r.count]));
}
