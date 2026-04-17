import { eq } from "drizzle-orm";
import { db, itineraries, stops } from "@/db";

const STATUSES = ["draft", "active", "archived"] as const;
type Status = (typeof STATUSES)[number];

export type ItineraryJson = {
  title: string;
  slug?: string;
  status: Status;
  stops: StopJson[];
};

export type StopJson = {
  day: number;
  order_in_day: number;
  name: string;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
  arrive_date?: string | null;
  depart_date?: string | null;
};

export type ImportResult =
  | { ok: true; slug: string; title: string; stopCount: number; created: boolean }
  | { ok: false; error: string };

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateShape(raw: unknown): { ok: true; json: ItineraryJson } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "JSON root must be an object." };
  const j = raw as Record<string, unknown>;

  if (typeof j.title !== "string" || j.title.trim().length === 0) {
    return { ok: false, error: "`title` is required and must be a non-empty string." };
  }
  if (typeof j.status !== "string" || !STATUSES.includes(j.status as Status)) {
    return { ok: false, error: "`status` must be one of draft | active | archived." };
  }
  if (j.slug !== undefined && (typeof j.slug !== "string" || j.slug.trim().length === 0)) {
    return { ok: false, error: "`slug`, if provided, must be a non-empty string." };
  }
  if (!Array.isArray(j.stops)) {
    return { ok: false, error: "`stops` must be an array." };
  }
  for (let i = 0; i < j.stops.length; i++) {
    const s = j.stops[i] as Record<string, unknown>;
    const where = `stops[${i}]`;
    if (!s || typeof s !== "object") return { ok: false, error: `${where} must be an object.` };
    if (typeof s.day !== "number") return { ok: false, error: `${where}.day must be a number.` };
    if (typeof s.order_in_day !== "number") {
      return { ok: false, error: `${where}.order_in_day must be a number.` };
    }
    if (typeof s.name !== "string" || s.name.trim().length === 0) {
      return { ok: false, error: `${where}.name must be a non-empty string.` };
    }
    if (typeof s.lat !== "number") return { ok: false, error: `${where}.lat must be a number.` };
    if (typeof s.lng !== "number") return { ok: false, error: `${where}.lng must be a number.` };
    if (typeof s.arrive_date !== "string") {
      return { ok: false, error: `${where}.arrive_date must be a YYYY-MM-DD string.` };
    }
    if (typeof s.depart_date !== "string") {
      return { ok: false, error: `${where}.depart_date must be a YYYY-MM-DD string.` };
    }
  }
  return { ok: true, json: j as unknown as ItineraryJson };
}

/**
 * Upsert an itinerary + its stops by slug. Replaces stops wholesale for an
 * existing itinerary (same semantics as the CLI importer). No auth — wrap
 * this in the server action (web UI) or CLI (file reader) to add
 * permissioning.
 */
export async function importItineraryFromJson(raw: unknown): Promise<ImportResult> {
  const check = validateShape(raw);
  if (!check.ok) return check;
  const json = check.json;

  const slug = json.slug?.trim() || slugify(json.title);
  if (slug.length === 0) {
    return { ok: false, error: "Could not derive a slug from the title." };
  }

  const [existing] = await db
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(eq(itineraries.slug, slug))
    .limit(1);

  let itineraryId: number;
  let created: boolean;
  if (existing) {
    await db
      .update(itineraries)
      .set({
        title: json.title,
        status: json.status,
        sourceJson: json as unknown,
        updatedAt: new Date(),
      })
      .where(eq(itineraries.id, existing.id));
    await db.delete(stops).where(eq(stops.itineraryId, existing.id));
    itineraryId = existing.id;
    created = false;
  } else {
    const [row] = await db
      .insert(itineraries)
      .values({
        slug,
        title: json.title,
        status: json.status,
        sourceJson: json as unknown,
      })
      .returning({ id: itineraries.id });
    itineraryId = row.id;
    created = true;
  }

  if (json.stops.length > 0) {
    await db.insert(stops).values(
      json.stops.map((s) => ({
        itineraryId,
        day: s.day,
        orderInDay: s.order_in_day,
        name: s.name,
        description: s.description ?? null,
        lat: s.lat != null ? String(s.lat) : null,
        lng: s.lng != null ? String(s.lng) : null,
        arriveDate: s.arrive_date ?? null,
        departDate: s.depart_date ?? null,
      })),
    );
  }

  return { ok: true, slug, title: json.title, stopCount: json.stops.length, created };
}
