import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
  const siblings = alias(stops, "sibling_stops");
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
    .from(stops)
    .innerJoin(siblings, eq(siblings.placeKey, stops.placeKey))
    .innerJoin(videos, eq(videos.stopId, siblings.id))
    .innerJoin(users, eq(users.id, videos.userId))
    .where(eq(stops.id, stopId))
    .orderBy(desc(videos.createdAt));
}

/**
 * All videos visible on each stop of an itinerary, one query. Videos attached
 * to any stop sharing a place_key with this itinerary's stops are included.
 * Keyed by this itinerary's stopId, newest first within each stop.
 */
export async function getVideosForItinerary(
  itineraryId: number,
): Promise<Map<number, VideoRow[]>> {
  const siblings = alias(stops, "sibling_stops");
  const rows = await db
    .select({
      thisStopId: stops.id,
      id: videos.id,
      stopId: videos.stopId,
      youtubeUrl: videos.youtubeUrl,
      note: videos.note,
      createdAt: videos.createdAt,
      userId: videos.userId,
      authorName: users.name,
    })
    .from(stops)
    .innerJoin(siblings, eq(siblings.placeKey, stops.placeKey))
    .innerJoin(videos, eq(videos.stopId, siblings.id))
    .innerJoin(users, eq(users.id, videos.userId))
    .where(eq(stops.itineraryId, itineraryId))
    .orderBy(desc(videos.createdAt));

  const byStop = new Map<number, VideoRow[]>();
  for (const r of rows) {
    const arr = byStop.get(r.thisStopId) ?? [];
    arr.push({
      id: r.id,
      stopId: r.stopId,
      youtubeUrl: r.youtubeUrl,
      note: r.note,
      createdAt: r.createdAt,
      userId: r.userId,
      authorName: r.authorName,
    });
    byStop.set(r.thisStopId, arr);
  }
  return byStop;
}

export async function getStopVideoCountsForItinerary(
  itineraryId: number,
): Promise<Map<number, number>> {
  const siblings = alias(stops, "sibling_stops");
  const rows = await db
    .select({
      thisStopId: stops.id,
      count: sql<number>`count(*)::int`,
    })
    .from(stops)
    .innerJoin(siblings, eq(siblings.placeKey, stops.placeKey))
    .innerJoin(videos, eq(videos.stopId, siblings.id))
    .where(eq(stops.itineraryId, itineraryId))
    .groupBy(stops.id);
  return new Map(rows.map((r) => [r.thisStopId, r.count]));
}
