"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { importItineraryFromJson } from "@/lib/import";
import type { ActionResult } from "./comments";

export async function importItinerary(
  json: string,
): Promise<ActionResult & { detail?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  if (!session.user.isEditor) {
    return { ok: false, error: "Only editors can import itineraries." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown parse error.";
    return { ok: false, error: `Invalid JSON: ${msg}` };
  }

  const result = await importItineraryFromJson(parsed);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/");
  revalidatePath(`/itineraries/${result.slug}`);

  const verb = result.created ? "Imported" : "Updated";
  return {
    ok: true,
    detail: `${verb} "${result.title}" with ${result.stopCount} stops.`,
  };
}
