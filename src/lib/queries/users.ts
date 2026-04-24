import { and, asc, count, gte, isNotNull } from "drizzle-orm";
import {
  comments,
  db,
  suggestions,
  users,
  videos,
  votes,
} from "@/db";

const ACTIVE_WINDOW_MS = 15 * 60 * 1000;

export type ActivePresence = {
  id: number;
  name: string | null;
  lastSeenAt: Date;
};

export async function getActivePresence(): Promise<ActivePresence[]> {
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(and(isNotNull(users.lastSeenAt), gte(users.lastSeenAt, cutoff)))
    .orderBy(asc(users.lastSeenAt));
  return rows.filter(
    (r): r is ActivePresence => r.lastSeenAt !== null,
  );
}

export type CrewMember = {
  id: number;
  name: string | null;
  lastSeenAt: Date | null;
  commentCount: number;
  voteCount: number;
  suggestionCount: number;
  videoCount: number;
  totalActions: number;
};

export async function getCrew(): Promise<CrewMember[]> {
  const [rows, commentRows, voteRows, suggestionRows, videoRows] =
    await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          lastSeenAt: users.lastSeenAt,
        })
        .from(users),
      db
        .select({ userId: comments.userId, n: count() })
        .from(comments)
        .groupBy(comments.userId),
      db
        .select({ userId: votes.userId, n: count() })
        .from(votes)
        .groupBy(votes.userId),
      db
        .select({ userId: suggestions.userId, n: count() })
        .from(suggestions)
        .groupBy(suggestions.userId),
      db
        .select({ userId: videos.userId, n: count() })
        .from(videos)
        .groupBy(videos.userId),
    ]);

  const toMap = (r: { userId: number; n: number }[]) =>
    new Map(r.map((x) => [x.userId, x.n]));
  const c = toMap(commentRows);
  const v = toMap(voteRows);
  const s = toMap(suggestionRows);
  const vd = toMap(videoRows);

  return rows
    .map((u) => {
      const commentCount = c.get(u.id) ?? 0;
      const voteCount = v.get(u.id) ?? 0;
      const suggestionCount = s.get(u.id) ?? 0;
      const videoCount = vd.get(u.id) ?? 0;
      return {
        id: u.id,
        name: u.name,
        lastSeenAt: u.lastSeenAt,
        commentCount,
        voteCount,
        suggestionCount,
        videoCount,
        totalActions:
          commentCount + voteCount + suggestionCount + videoCount,
      };
    })
    .sort((a, b) => {
      const aSeen = a.lastSeenAt?.getTime() ?? 0;
      const bSeen = b.lastSeenAt?.getTime() ?? 0;
      if (aSeen !== bSeen) return bSeen - aSeen;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
}
