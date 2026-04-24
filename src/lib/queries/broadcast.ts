import { and, eq, gte, desc } from "drizzle-orm";
import {
  db,
  suggestions,
  videos,
  users,
  stops,
  itineraries,
} from "@/db";

export type BroadcastEvent =
  | {
      kind: "confirmation";
      id: number;
      at: Date;
      title: string;
      notes: string | null;
      authorName: string | null;
      itinerarySlug: string;
      itineraryTitle: string;
      stopId: number;
      stopName: string;
      stopDay: number;
    }
  | {
      kind: "suggestion";
      id: number;
      at: Date;
      title: string;
      notes: string | null;
      authorName: string | null;
      itinerarySlug: string;
      itineraryTitle: string;
      stopId: number;
      stopName: string;
      stopDay: number;
    }
  | {
      kind: "video";
      id: number;
      at: Date;
      note: string | null;
      youtubeUrl: string;
      authorName: string | null;
      itinerarySlug: string;
      itineraryTitle: string;
      stopId: number;
      stopName: string;
      stopDay: number;
    };

/**
 * Noteworthy activity across the app since `cutoff`, newest first.
 * Three parallel queries (confirmations, new suggestions, new videos) merged
 * in JS — simpler than a SQL UNION and each maps cleanly to its event shape.
 *
 * A suggestion produces either a "confirmation" (if isConfirmed) or a
 * "suggestion" event, never both, so there are no duplicates.
 */
export async function getRecentActivity(
  cutoff: Date,
): Promise<BroadcastEvent[]> {
  const [confirmedRows, newRows, videoRows] = await Promise.all([
    db
      .select({
        id: suggestions.id,
        at: suggestions.updatedAt,
        title: suggestions.title,
        notes: suggestions.notes,
        authorName: users.name,
        itinerarySlug: itineraries.slug,
        itineraryTitle: itineraries.title,
        stopId: stops.id,
        stopName: stops.name,
        stopDay: stops.day,
      })
      .from(suggestions)
      .innerJoin(users, eq(users.id, suggestions.userId))
      .innerJoin(stops, eq(stops.id, suggestions.stopId))
      .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
      .where(
        and(
          eq(suggestions.isConfirmed, true),
          gte(suggestions.updatedAt, cutoff),
        ),
      )
      .orderBy(desc(suggestions.updatedAt)),
    db
      .select({
        id: suggestions.id,
        at: suggestions.createdAt,
        title: suggestions.title,
        notes: suggestions.notes,
        authorName: users.name,
        itinerarySlug: itineraries.slug,
        itineraryTitle: itineraries.title,
        stopId: stops.id,
        stopName: stops.name,
        stopDay: stops.day,
      })
      .from(suggestions)
      .innerJoin(users, eq(users.id, suggestions.userId))
      .innerJoin(stops, eq(stops.id, suggestions.stopId))
      .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
      .where(
        and(
          eq(suggestions.isConfirmed, false),
          gte(suggestions.createdAt, cutoff),
        ),
      )
      .orderBy(desc(suggestions.createdAt)),
    db
      .select({
        id: videos.id,
        at: videos.createdAt,
        note: videos.note,
        youtubeUrl: videos.youtubeUrl,
        authorName: users.name,
        itinerarySlug: itineraries.slug,
        itineraryTitle: itineraries.title,
        stopId: stops.id,
        stopName: stops.name,
        stopDay: stops.day,
      })
      .from(videos)
      .innerJoin(users, eq(users.id, videos.userId))
      .innerJoin(stops, eq(stops.id, videos.stopId))
      .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
      .where(gte(videos.createdAt, cutoff))
      .orderBy(desc(videos.createdAt)),
  ]);

  const events: BroadcastEvent[] = [
    ...confirmedRows.map((r) => ({ kind: "confirmation" as const, ...r })),
    ...newRows.map((r) => ({ kind: "suggestion" as const, ...r })),
    ...videoRows.map((r) => ({ kind: "video" as const, ...r })),
  ];

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
