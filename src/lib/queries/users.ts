import { and, asc, gte, isNotNull } from "drizzle-orm";
import { db, users } from "@/db";

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
