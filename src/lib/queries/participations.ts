import { and, desc, eq, ne } from "drizzle-orm";
import { db, itineraries, participations, users } from "@/db";

export type ParticipationRow = {
  userId: number;
  userName: string | null;
  joinsOn: string | null;
  departsOn: string | null;
  note: string | null;
};

export async function getParticipationsForItinerary(
  itineraryId: number,
): Promise<Map<number, ParticipationRow>> {
  const rows = await db
    .select({
      userId: participations.userId,
      userName: users.name,
      joinsOn: participations.joinsOn,
      departsOn: participations.departsOn,
      note: participations.note,
    })
    .from(participations)
    .innerJoin(users, eq(users.id, participations.userId))
    .where(eq(participations.itineraryId, itineraryId));

  const byUser = new Map<number, ParticipationRow>();
  for (const r of rows) byUser.set(r.userId, r);
  return byUser;
}

export type TripMate = { id: number; name: string | null };

export async function getTripMates(): Promise<TripMate[]> {
  // Returned unsorted — page sorts with localeCompare so Turkish characters
  // (Ö, Ü, Ç) land in the right place regardless of Postgres collation.
  return await db
    .select({ id: users.id, name: users.name })
    .from(users);
}

export type PrefillCandidate = {
  joinsOn: string | null;
  departsOn: string | null;
  fromTitle: string;
};

/**
 * Most recently updated participation row for a user on any *other*
 * itinerary. Used to prefill the editor when they're setting a window
 * for the first time on this trip.
 */
export async function getRecentOtherParticipation(
  userId: number,
  excludeItineraryId: number,
): Promise<PrefillCandidate | null> {
  const [row] = await db
    .select({
      joinsOn: participations.joinsOn,
      departsOn: participations.departsOn,
      fromTitle: itineraries.title,
    })
    .from(participations)
    .innerJoin(itineraries, eq(itineraries.id, participations.itineraryId))
    .where(
      and(
        eq(participations.userId, userId),
        ne(participations.itineraryId, excludeItineraryId),
      ),
    )
    .orderBy(desc(participations.updatedAt))
    .limit(1);
  if (!row) return null;
  if (row.joinsOn === null && row.departsOn === null) return null;
  return row;
}
