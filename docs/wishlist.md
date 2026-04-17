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

Andre confirmed behaviourally that a YouTube link on "Napoli" in itinerary A
also shows up on "Napoli" in itinerary B. Worth verifying in code — the current
schema keys videos to `stops.id`, and each itinerary has its own `stops` rows
after import, so they *shouldn't* share. If they do, something interesting is
going on (a query joining on name? a UI quirk?). If they don't and Andre saw
coincidence, the question is whether we *want* them shared and how — by stop
name, by lat/lng proximity, or via a new `places` table above `stops`.

Implementation sketch if we want it deliberate:

- Add a `places` table (keyed by some canonical name or geohash). Stops join to
  a place; videos attach to the place. Itineraries reference stops, not places,
  so the collaboration layer spans.
- Not trivial. Would ripple through suggestions and comments too if we wanted
  those shared as well — which opens a whole design question.

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
