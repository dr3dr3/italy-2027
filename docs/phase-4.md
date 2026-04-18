# Phase 4 — wishlist destinations and day visits

Decided 2026-04-18. Captures the shape of the next phase so nobody has to
re-derive it when we actually start building. Nothing here is built yet.

## Why this phase

Two things the current model can't express, both surfaced by the group:

1. **Input before itineraries.** Friends want to chuck destination ideas at
   the wall before Ozzie has committed them to an itinerary. Today the only
   way to say "what about Palermo?" is as a comment on an existing stop,
   which is the wrong container.
2. **Day visits vs overnight stops.** An itinerary is a spine of places we
   sleep. But on any given day we might drive somewhere for lunch and come
   back, or stop off at a town on the way between two overnight bases.
   Current `stops` conflates both and it shows — the schema pretends
   everything has an `arrive_date`/`depart_date` pair that makes sense.

Phase 4 adds two entities (`wishlist_destinations`, `visits`) and one
editor flow (promote wishlist → stop or visit). Everything else is fallout
from those two tables.

## The vocabulary, pinned

| Thing | Scope | Who writes | Example |
|---|---|---|---|
| **Stop** (exists) | Itinerary-scoped, overnight | Editor | "3 nights in Lecce" |
| **Suggestion** (exists) | Inside a stop | Everyone | "Gelato at Natale" |
| **Visit** (new) | Anchored to a stop, no overnight | Editor | "Day trip to Otranto from Lecce" |
| **Wishlist** (new) | Global, pre-itinerary | Everyone | "Somewhere in Sicily, maybe?" |

Stop = bed for the night. Visit = where we spent the day. Suggestion = what
we did while we were there. Wishlist = an idea not yet placed.

## Schema

### `visits`

| Column        | Type         | Notes                                     |
|---------------|--------------|-------------------------------------------|
| id            | bigserial PK |                                           |
| stop_id       | bigint FK    | → stops.id, on delete cascade — anchor   |
| kind          | text         | `daytrip` \| `enroute`                    |
| name          | text         | e.g. "Otranto"                            |
| description   | text         | Optional blurb                            |
| lat           | numeric      | For map pin                               |
| lng           | numeric      | For map pin                               |
| visit_date    | date         | Optional. If known, which day we went.   |
| order_in_leg  | int          | Sort order for multiple enroute visits on the same leg |
| created_at    | timestamptz  |                                           |

Two kinds, one table:

- **`daytrip`** — round-trip from `stop_id`. You sleep at the anchor both
  nights around the visit.
- **`enroute`** — on the drive leaving `stop_id` toward the next stop.
  "Next stop" is derived from itinerary ordering (`day`, `order_in_day`),
  not stored. If you reorder stops, enroute visits follow the leg they
  belong to — that's the point.

Validation: enroute visits can't be attached to the last stop of an
itinerary (there is no next leg). Surface that at write time, not silently.

### `wishlist_destinations`

| Column        | Type         | Notes                                     |
|---------------|--------------|-------------------------------------------|
| id            | bigserial PK |                                           |
| added_by      | bigint FK    | → users.id                                |
| name          | text         | "Palermo", "somewhere in Sicily"         |
| description   | text         | Optional — why they want it              |
| lat           | numeric      | Optional. Filled at promotion if missing |
| lng           | numeric      | Optional.                                 |
| status        | text         | `pending` \| `promoted` \| `passed`      |
| created_at    | timestamptz  |                                           |

Flat. No region grouping, no tags. Status drives visibility:

- `pending` — shown in the default home-page list
- `promoted` — editor has converted it to a stop or visit; hidden from
  default view but still findable in a "see everything" toggle
- `passed` — editor has explicitly said "not doing this"; also hidden

We deliberately don't store a back-pointer to the promoted stop/visit. If
we ever want that trail, `source_json` on itineraries already records the
import and we can reconstruct. Keeping the wishlist row (rather than
deleting) matters so the attached comments and votes survive as context.

### Polymorphic extensions

Both `comments` and `votes` grow their `target_type` enum:

- `comments.target_type` adds `wishlist_destination` and `visit`
- `votes.target_type` adds `wishlist_destination` and `visit`

No new tables; the polymorphic shape already handles this. The one thing
to watch: existing `target_type` checks in queries and any `CHECK`
constraint need updating together.

## UX surfaces

### Home page — wishlist card

A new section on the home page, below the itineraries list. Shows the
`pending` wishlist as a flat list. Each row:

- Name, who added it, short description
- Thumbs-up count and comment count (polymorphic, same as stops)
- Editor-only kebab: "Promote to stop", "Promote to visit", "Pass"

"Add a destination" button opens a small form (name, optional
description, optional lat/lng via a map click — nice, not required).

Empty state: something dry — "Nothing on the wishlist. Unusual." Don't
overdo it.

### Itinerary detail — visits rendered inline

Visits appear on the stop they're anchored to. Daytrips render as a
sub-row indented under the anchor stop. Enroute visits render on the
"leg" between the anchor and the next stop — visually, a small row
*between* two stops, not under one.

Mobile-first: stack everything vertically, don't try to be clever about
left/right columns.

### Promotion flow (editor only)

One action, two shapes:

- **Promote to stop** → pick itinerary, pick day/order, fill in any
  missing lat/lng and dates. Wishlist status → `promoted`.
- **Promote to visit** → pick itinerary, pick anchor stop, pick
  `daytrip` or `enroute`, fill in any missing lat/lng. Wishlist status
  → `promoted`.

Implemented as server actions, not a separate admin page. The kebab on
the wishlist row opens a small dialog. No bulk promotion — one at a time
is fine for this volume.

## Map behaviour

Stops and the route polyline stay always-visible. Visits are the thing
that would crowd the view, so:

- **Visits are hidden below zoom 9.** At home-page "fit all stops" scale
  (usually zoom 6–7 for an Italy-wide itinerary) you see the spine only.
- **Visits appear at zoom ≥ 9** (roughly sub-regional — Puglia-sized
  area on screen). Enroute visits render on the polyline; daytrip
  visits render near their anchor with a small connecting line.
- **Visit markers are visually distinct from stops** — outlined circle vs
  filled pin, or a different shape. Same palette (terracotta / olive /
  etc.) so the itinerary colour still reads.

No clustering. Six friends will never produce enough visits to need it,
and the cluster icons add noise. If we're wrong about volume, revisit.

Nice-to-have, not required for v1 of the map:

- A small "show visits" toggle that forces visits on at all zooms,
  for when the editor is planning and wants the full picture.

## Open questions to answer before building

- **Wishlist lat/lng at creation time.** Require it? Allow users to add
  fuzzy ideas ("somewhere in Sicily") with no coordinates? Probably
  allow fuzzy, with the understanding that the editor fills it in at
  promotion. Flag in the form copy so people know.
- **Do visit comments span `place_key` the way videos do on stops?** A
  day trip to "Otranto" from itinerary A vs a day trip to Otranto from
  itinerary B — same place. Probably yes, for consistency with videos,
  but this adds a `place_key` column to `visits` and widens the video
  query. Decide when we get there.
- **Can a visit have suggestions attached to it?** ("On the Otranto day
  trip, try this restaurant.") Currently `suggestions.stop_id` is a hard
  FK. Either widen to polymorphic, or just tell the editor to add it to
  the anchor stop with "Otranto —" in the title. Latter is cheaper.
- **Who can promote?** Locked to `is_editor = true`, same as itinerary
  edits. No need to open this up.
- **Voting on wishlist — does the editor vote?** Yes, they're part of
  the group. The promotion decision is still theirs; the vote just
  signals personal enthusiasm.

## Out of scope for phase 4

- Wishlist grouping, tags, regions — flat list is the whole point
- Wishlist notifications / email digests — no
- Wishlist → auto-draft-itinerary — Ozzie plans, the list is an input
- Visit-level accommodations, transport legs, costs — that's the
  lock-in wishlist in [`wishlist-future.md`](./wishlist-future.md),
  not this
- Realtime anything — CLAUDE.md still rules
