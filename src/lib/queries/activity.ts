import { and, gt, ne, count } from "drizzle-orm";
import { db, comments, suggestions, videos } from "@/db";

export type ActivityCounts = {
  comments: number;
  suggestions: number;
  videos: number;
};

/**
 * Count of activity created since the given timestamp, excluding rows
 * authored by the current user (you don't need to be told about your own
 * comment). Drives the "what's new since you were here" chip on the home.
 */
export async function getActivitySince(
  since: Date,
  selfUserId: number | null,
): Promise<ActivityCounts> {
  // user_id is non-null in all three tables, so a sentinel of 0 cannot
  // match any row when there is no current user.
  const self = selfUserId ?? 0;

  const [c, s, v] = await Promise.all([
    db
      .select({ n: count() })
      .from(comments)
      .where(and(gt(comments.createdAt, since), ne(comments.userId, self))),
    db
      .select({ n: count() })
      .from(suggestions)
      .where(and(gt(suggestions.createdAt, since), ne(suggestions.userId, self))),
    db
      .select({ n: count() })
      .from(videos)
      .where(and(gt(videos.createdAt, since), ne(videos.userId, self))),
  ]);

  return {
    comments: c[0]?.n ?? 0,
    suggestions: s[0]?.n ?? 0,
    videos: v[0]?.n ?? 0,
  };
}
