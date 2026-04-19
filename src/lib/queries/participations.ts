import { asc, eq } from "drizzle-orm";
import { db, participations, users } from "@/db";

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
    .where(eq(participations.itineraryId, itineraryId))
    .orderBy(asc(users.name));

  const byUser = new Map<number, ParticipationRow>();
  for (const r of rows) byUser.set(r.userId, r);
  return byUser;
}

export type TripMate = { id: number; name: string | null };

export async function getTripMates(): Promise<TripMate[]> {
  return await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .orderBy(asc(users.name));
}
