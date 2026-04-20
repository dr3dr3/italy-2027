import fs from "node:fs";
import path from "node:path";
import type { PromptSignal } from "@/lib/queries/prompt-signal";

export const PROMPT_VERSION = "v1 · 2026-04-20";

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

function numberToWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function formatGroup(group: PromptSignal["group"]): string {
  if (group.length === 0) return "(group list unavailable)";
  return group
    .map((u) => (u.isEditor ? `${u.name} (editor)` : u.name))
    .join(", ");
}

function formatWishlist(wishlist: PromptSignal["wishlist"]): string {
  if (wishlist.length === 0) {
    return "(no wishlist entries yet — work from the loved stops and your own sense of the group)";
  }
  return wishlist
    .map((w) => {
      const hearts = w.voteCount > 0 ? ` · ${w.voteCount} ♥` : "";
      const who = w.addedBy ? ` — added by ${w.addedBy}` : "";
      const note = w.description ? ` ("${w.description}")` : "";
      return `- ${w.name}${who}${note}${hearts}`;
    })
    .join("\n");
}

function formatLovedStops(stops: PromptSignal["lovedStops"]): string {
  if (stops.length === 0) {
    return "(no hearts on any stops yet)";
  }
  return stops
    .map((s) => `- ${s.name} — ${s.voteCount} ♥ (from "${s.itineraryTitle}")`)
    .join("\n");
}

function formatDateWindow(start: string | null, end: string | null): string {
  if (start && end) {
    return `Arrive around ${start}, depart around ${end}. Flex by a day or two if it helps the shape.`;
  }
  if (start) {
    return `Arrive around ${start}. Depart date is flexible — propose something sensible.`;
  }
  if (end) {
    return `Depart around ${end}. Arrival date is flexible — propose something sensible.`;
  }
  return "No fixed dates yet — assume somewhere in Sep–Oct 2027, roughly 2–4 weeks.";
}

export type PromptInputs = {
  signal: PromptSignal;
  startDate: string | null;
  endDate: string | null;
};

let cached: string | null = null;

function loadTemplate(): string {
  if (cached) return cached;
  const p = path.join(process.cwd(), "src/lib/prompts/itinerary-generator.md");
  cached = fs.readFileSync(p, "utf8");
  return cached;
}

export function renderPrompt({ signal, startDate, endDate }: PromptInputs): string {
  const template = loadTemplate();
  return template
    .replaceAll("{{group_size}}", numberToWord(signal.group.length))
    .replaceAll("{{group}}", formatGroup(signal.group))
    .replaceAll("{{wishlist}}", formatWishlist(signal.wishlist))
    .replaceAll("{{loved_stops}}", formatLovedStops(signal.lovedStops))
    .replaceAll("{{date_window}}", formatDateWindow(startDate, endDate));
}
