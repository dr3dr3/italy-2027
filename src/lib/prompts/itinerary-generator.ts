import type { PromptSignal } from "@/lib/queries/prompt-signal";

export const PROMPT_VERSION = "v1 · 2026-04-20";

// Edit the template here. Bump PROMPT_VERSION in the same commit when you do.
const TEMPLATE = `You're helping a group of {{group_size}} friends plan a trip to Italy in 2027.

The group: {{group}}.

Ozzie is the trip editor and will be the one pasting this into your chat.

WORK IN TWO PHASES. Do not skip phase 1.

PHASE 1 — PROPOSE
Present the itinerary as a readable day-by-day plan. For each stop, give:
- the city/town
- arrive and depart dates
- one line on why it earns its slot (not brochure prose — dry, specific)

Then STOP and wait for feedback. Be ready to iterate: swap cities, stretch or
trim days, rearrange the order, drop things that aren't landing.

Before detailing anything, offer 2–3 rough shapes (e.g. "south-heavy 14 days",
"north loop 18 days", "one-base-plus-day-trips 12 days") and let Ozzie pick.

Do not output JSON in phase 1.

PHASE 2 — EXPORT
Only when Ozzie says he's happy, reply with a single JSON block in exactly the
shape below and nothing else around it. No prose, no code fence language tag
commentary, just the JSON object.

EXAMPLE (a real itinerary from the app — match this shape exactly):

{
  "title": "Naples to Prague via Roma",
  "status": "draft",
  "stops": [
    {
      "day": 1,
      "order_in_day": 1,
      "name": "Napoli",
      "description": "Land. Pizza, espresso, jet-lag.",
      "lat": 40.8518,
      "lng": 14.2681,
      "arrive_date": "2027-09-16",
      "depart_date": "2027-09-19"
    },
    {
      "day": 4,
      "order_in_day": 1,
      "name": "Stromboli",
      "description": "4.5-hour ferry, one night under the volcano.",
      "lat": 38.7944,
      "lng": 15.2125,
      "arrive_date": "2027-09-19",
      "depart_date": "2027-09-20"
    }
  ]
}

RULES
- dates are "YYYY-MM-DD" strings
- status is one of: "draft" | "active" | "archived" — use "draft"
- every stop needs every field in the example. No extras, no omissions.
- stops in chronological order; day 1 is arrival day
- order_in_day starts at 1 per day (only goes higher if multiple stops same day)
- description: one dry sentence. Think "Land. Pizza, espresso, jet-lag." not
  "Discover the vibrant coastal city of Naples, where ancient history meets…"
- lat/lng to 4 decimals is fine

DATE WINDOW
{{date_window}}

GROUP SIGNAL — what the group has actually asked for

Wishlist destinations (added by specific people):
{{wishlist}}

Most-loved stops from past itineraries (heart counts):
{{loved_stops}}

Lean on these, but don't feel obliged to cram every wishlist entry in. A tight
loop beats a 25-stop slog. If something doesn't fit this shape, say so — it can
wait for the next itinerary.

LOCAL CONTEXT — what's on at that time
For each proposed stop, flag anything notable happening during those dates:
- major festivals (Palio di Siena, Venice Biennale, Settembre Lucchese, sagre…)
- religious or national holidays that close museums or crowd towns
  (Ferragosto 15 Aug, Assumption, patron-saint feast days, Liberation Day)
- known weekly closures (e.g. Vatican Museums closed most Sundays)
- shoulder-season quirks (some coastal spots start shutting in mid-October)

If you're not certain about a 2027-specific date, say so — don't invent it.

VOICE
The app's voice is dry, Aussie, occasionally Italian or Turkish flavoured.
Descriptions in the final JSON should match that voice. Don't force jokes —
most stops get a flat, specific sentence. Humour is earned, not sprinkled.
`;

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

export function renderPrompt({ signal, startDate, endDate }: PromptInputs): string {
  return TEMPLATE
    .replaceAll("{{group_size}}", numberToWord(signal.group.length))
    .replaceAll("{{group}}", formatGroup(signal.group))
    .replaceAll("{{wishlist}}", formatWishlist(signal.wishlist))
    .replaceAll("{{loved_stops}}", formatLovedStops(signal.lovedStops))
    .replaceAll("{{date_window}}", formatDateWindow(startDate, endDate));
}
