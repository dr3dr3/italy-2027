import { asc, eq } from "drizzle-orm";
import { db, itineraries, stops } from "@/db";

export type ActiveStopRow = {
  id: number;
  name: string;
  day: number;
  orderInDay: number;
  lat: string | null;
  lng: string | null;
  itineraryId: number;
  itinerarySlug: string;
  itineraryTitle: string;
};

export async function getStopsForActiveItineraries(): Promise<ActiveStopRow[]> {
  return db
    .select({
      id: stops.id,
      name: stops.name,
      day: stops.day,
      orderInDay: stops.orderInDay,
      lat: stops.lat,
      lng: stops.lng,
      itineraryId: itineraries.id,
      itinerarySlug: itineraries.slug,
      itineraryTitle: itineraries.title,
    })
    .from(stops)
    .innerJoin(itineraries, eq(itineraries.id, stops.itineraryId))
    .where(eq(itineraries.status, "active"))
    .orderBy(asc(itineraries.id), asc(stops.day), asc(stops.orderInDay));
}
