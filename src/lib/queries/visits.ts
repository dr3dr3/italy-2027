import { asc, eq } from "drizzle-orm";
import { db, visits, stops } from "@/db";

export type VisitRow = {
  id: number;
  stopId: number;
  kind: "daytrip" | "enroute";
  name: string;
  description: string | null;
  lat: string | null;
  lng: string | null;
  visitDate: string | null;
  orderInLeg: number;
};

export type StopVisits = {
  daytrips: VisitRow[];
  enroute: VisitRow[];
};

/**
 * Visits for every stop of an itinerary, keyed by stopId and bucketed by
 * kind. One round-trip via a join through stops so we scope by itinerary_id.
 * Enroute bucket is ordered by order_in_leg; daytrips by created order.
 */
export async function getVisitsForItinerary(
  itineraryId: number,
): Promise<Map<number, StopVisits>> {
  const rows = await db
    .select({
      id: visits.id,
      stopId: visits.stopId,
      kind: visits.kind,
      name: visits.name,
      description: visits.description,
      lat: visits.lat,
      lng: visits.lng,
      visitDate: visits.visitDate,
      orderInLeg: visits.orderInLeg,
      createdAt: visits.createdAt,
    })
    .from(visits)
    .innerJoin(stops, eq(stops.id, visits.stopId))
    .where(eq(stops.itineraryId, itineraryId))
    .orderBy(asc(visits.orderInLeg), asc(visits.createdAt));

  const byStop = new Map<number, StopVisits>();
  for (const r of rows) {
    const bucket = byStop.get(r.stopId) ?? { daytrips: [], enroute: [] };
    const v: VisitRow = {
      id: r.id,
      stopId: r.stopId,
      kind: r.kind as "daytrip" | "enroute",
      name: r.name,
      description: r.description,
      lat: r.lat,
      lng: r.lng,
      visitDate: r.visitDate,
      orderInLeg: r.orderInLeg,
    };
    if (v.kind === "enroute") bucket.enroute.push(v);
    else bucket.daytrips.push(v);
    byStop.set(r.stopId, bucket);
  }
  return byStop;
}
