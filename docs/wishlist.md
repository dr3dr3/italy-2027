# Wishlist

Friend-driven ideas captured as they come in. Not a roadmap — we'll pick from
this when (and if) we decide to scope Phase 4.

## 1. Favicon with travel or Italy flavour

The default Next favicon is still in place. A small bespoke one — Italian flag
stripes, an old-map compass, a luggage tag, whatever — sets the tone. Small,
cheap, high-vibe return. SVG favicon with PNG fallback lives in `src/app/`.

## 2. Who else is logged in / active

"Can I see who else is here?" Options:

- **Poll-based presence** — add `users.last_seen_at`; bump it from middleware or
  a `/api/ping` call on page visits. Home page shows a small row of names with
  "active in the last N minutes" dots.
- **No realtime** — WebSockets / SSE are out per CLAUDE.md. Polling every ~30s is
  plenty for a 6–8 person trip planner.

Cost: one column, one middleware tweak, one component. Cheap.

## 3. One video shared across all itineraries with the same stop

**Confirmed (2026-04-17):** Andre added a YouTube link on Napoli in itinerary A
and it did *not* appear on Napoli in itinerary B. That matches the schema —
`videos.stop_id` points at a specific `stops.id`, and the importer replaces
stops wholesale per itinerary, so Napoli-A and Napoli-B are different rows.
We want them to share.

### The design question, in one line

How do we decide that "Napoli here" and "Napoli there" are the same place?

Three options, cheapest to heaviest:

**A. Match by stop name (text equality).** Query: "give me every video whose
stop's name equals this stop's name." No schema change. Roughly an afternoon.
Fragile the moment someone imports "Naples" or "Napoli (old town)" — silent
miss. Fine as a stopgap, bad as the final answer.

**B. Add a `place_key` column to `stops`.** Denormalised canonical key
(slugified name, or a rounded lat/lng bucket). Videos stay on `stop_id`; the
query widens to "all videos whose stop shares this stop's `place_key`." Import
generates the key. No FK changes, no data migration beyond a backfill.
~half a day of work, including updating the importer and the three video
queries in `src/lib/queries/videos.ts`.

**C. Proper `places` table.** `places (id, canonical_name, lat, lng)`,
`stops.place_id → places.id`, `videos.place_id → places.id` (moves off
`stop_id`). Most correct. Worst bang-for-buck: schema migration, data
migration to dedupe existing stops into places, rewrite every video query,
and we have to decide at the same time whether comments and suggestions
should also span itineraries (they're polymorphic on `stop`, so the same
question bites them). Probably a day-plus and lots of churn for a handful of users.

### Recommendation

**Go with B.** It solves the reported problem, doesn't force us to answer the
comments/suggestions question yet, and is reversible — we can promote to a
real `places` table later if we ever want to.

### Open questions to answer before building

- Canonical key: slug of `name`, or geohash of lat/lng? Slug is simpler but
  breaks on "Napoli" vs "Naples". Geohash is robust but opaque. Probably
  slug + manual override column for the one or two cases that disagree.
- Do comments and suggestions follow the same rule? If yes, same design again
  on the polymorphic target. If no, we have to justify why videos are special.
  Worth asking the group.
- Delete semantics: if Napoli-A is removed from an itinerary, does a video
  Andre attached there vanish everywhere, or survive on Napoli-B? Option B
  with `on delete cascade` on `stop_id` means it vanishes. Probably fine; flag
  it so no one's surprised.

## 4. Managing multiple itineraries and their status

Open UX question. Current state: draft ↔ active ↔ archived, editor-only. Things
to dig into when we revisit:

- Is draft/active/archived the right axis at all? Maybe "shortlist" vs "final"
  instead?
- Is there room for a **comparison view** — side-by-side stops across two
  itineraries?
- Should there be a **per-user favourite** marking distinct from the
  group-level votes?
- How do archived itineraries stay findable without cluttering?

Ask the group first — don't build without hearing what's actually annoying.

## 5. Overview map colours unreadable for colour-blind viewers

Andre (colour-blind) can't tell the two route colours apart on the home page
map. Current palette: terracotta `#c65d3a` and olive `#6b7a3f` — both mid-
value earth tones, low chroma separation. For deutan/protan vision they read
as near-identical mud.

Fixes, cheapest to heaviest:

- Add letter/number labels inside the pins (e.g. "R" / "T" for Roma / Tirol),
  and on the legend swatch. Redundant encoding independent of colour.
- Differentiate the polyline by dash pattern per itinerary as well as colour.
- Rework the palette so at least one colour has a very different lightness
  (e.g. keep terracotta, swap olive for ink or wine). Check against the
  [Coblis simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/)
  before shipping.

Cheapest two together (labels + dash patterns) probably solve it without a
palette rework. Worth doing soon — accessibility basics.
