# Wishlist — future / time-based

A brainstorm for how the app could evolve across the life of the trip, not a
roadmap. Sibling to [`wishlist.md`](./wishlist.md), which is friend-driven
ideas. This one is time-driven: things that only make sense once plans firm
up, once we're close to the date, or once we're actually in Italy.

Treat every item as a prompt, not a commitment. Most will get cut. The whole
point of writing them down is to stop forgetting the good ones between
conversations.

Three (four-ish) phases:

- **A. Lock-in** — itineraries firming up, bookings starting, dates real
- **B. Countdown** — weeks out, packing and logistics mode
- **C. In-country** — on the ground in Italy, 2027
- **D. After** — looking back

---

## A. Lock-in — plans turning into bookings

We're currently pre-Phase 2. "Lock-in" is whenever we stop comparing
itineraries and start booking flights, trains, and beds. Schema is the
binding constraint here: several of these ideas add columns to `stops` or a
new small table.

### A1. Booking status on stops

Each stop gets a state: `idea` · `tentative` · `booked` · `cancelled`. Editor
sets it. Rendered as a small chip next to the stop name. Makes it obvious at
a glance which parts of the trip are real and which are still dreaming.

Cheap. One column, one enum, one chip component. Half a day.

### A2. Accommodation per stop

A lot of our "stops" are really "town + place we're sleeping". Right now the
schema only tracks the stop. Options:

- Add `stops.accommodation_name` + `accommodation_url` — fastest, enough for
  "here's the Airbnb, click through" behaviour.
- A proper `accommodations` table if we ever want per-person room
  assignments, check-in times, confirmation numbers. Probably overkill.

Start with the two columns. Upgrade later if it actually becomes annoying.

### A3. Transport legs between stops

Between Napoli and Roma there's a train. Between Roma and Milano there's
another. None of this is in the schema today — stops are points, not edges.

Cheapest move: a `transport` table with `from_stop_id`, `to_stop_id`, `mode`
(`train` · `flight` · `car` · `ferry` · `walk`), `depart_at`, `arrive_at`,
`confirmation_ref`, `notes`. Render as a thin row between stops on the
detail page. Editor-owned like stops.

Non-trivial — this is the first thing on the wishlist that changes the shape
of the data model. Worth doing only if we actually book multi-leg transport
as a group, which we probably will.

### A4. Per-person calendar export

An `.ics` feed per itinerary so anyone can drop the trip into their phone
calendar. Each stop (or each booked transport leg) becomes a calendar event.
Read-only, one endpoint, one library (`ics` on npm — flag before installing).

Small but high-leverage. Means the trip shows up in people's normal flow
without them opening the app.

### A5. Budget per stop + running total

Rough costs per stop (accommodation + activities + a wild guess at food).
Home page shows a running per-person total per itinerary. Helps the
vote-between-itineraries conversation move past vibes.

Risk: nobody updates it, numbers drift, becomes a lie. Mitigate by keeping
the inputs minimal — one number per stop, editor-only, marked "rough".

---

## B. Countdown — weeks out

Somewhere around 4–6 weeks before departure the app's job changes. Nobody's
comparing itineraries any more. It's about "what do I need to do before I
leave".

### B1. Countdown on the home page

"43 days to Roma." Small, top of the home page. Pulls from the earliest
`date` on the active itinerary's stops. Zero schema change. An hour of work.

High vibe-per-byte. People will open the app just to see the number tick
down.

### B2. Shared packing list with claims

One list per itinerary. Items have an optional `claimed_by` user — so when
Ozzie says "I'll bring the universal adapter" it's visible to everyone else
before they buy their own.

New table: `packing_items (id, itinerary_id, label, claimed_by_user_id,
notes, is_group_item)`. Group items (adapter, first-aid kit) vs personal
(your own passport) distinguished by `is_group_item`.

Moderate. Half a day. Good candidate for Phase 4 if it ever lands.

### B3. Arrival board — who lands when

Friends flying in from different cities on different days. A small table
at the top of the itinerary: name, arrival date, arrival time, airport,
flight number. Editor doesn't need to own this — anyone can fill in their
own row. Could reuse the `users` table with an arrival-info sub-table keyed
per itinerary (since we'd repeat this for each big trip).

Useful well before anyone's in Italy. Also doubles as the "who's picking up
Kemal from Fiumicino" coordination.

### B4. Weather nudge (2 weeks out)

Pull a forecast per stop from Open-Meteo (free, no key) once we're within
their ~16-day window. Render a row on each stop: "expected 26°C, light
rain". No alerts, no push — just a quiet signal that might change what
people pack.

One serverless call, cached daily. Cheap. Could land as part of B1.

### B5. Pre-trip docs locker — **proceed with caution**

Passport numbers, insurance policy numbers, booking confirmation PDFs in one
place. Useful. Also a liability. Anyone on the app has read-access to
everyone else's identity docs.

Flag before building: do we actually want this, given the auth is magic-link
email and the bar for "stealing someone's session" isn't Fort Knox? Safer
alternative: just a notes field per user that says "my passport is in the
grey folder at home" — no actual numbers stored. Probably the right answer.

### B6. Emergency contact card per user

One short free-text field: who to ring if something goes wrong. Everyone
fills in their own. Rendered on a "trip card" alongside arrival info. This
one's just genuinely useful, and not sensitive the way B5 is.

---

## C. In-country — actually in Italy

This is the phase where the product stops being a planning tool and starts
being an *on-the-ground* tool. Most current features (comments, votes,
suggestions) become nearly useless here. New ones take over.

**Big question before any of this lands:** does the app need to work
offline? Italian rural data is fine but patchy. If yes, a lot of what
follows needs service-worker caching baked in. If no, we can be more relaxed
and lean on "you'll have wifi at the Airbnb anyway". Probably the honest
answer for a small group is: nice-to-have, not must-have.

### C1. "Today" view

The app opens and lands you on today's stop automatically. "You're in Roma.
Here's the plan, the Airbnb address, the train for tomorrow, and the group's
suggestions for dinner tonight."

Zero schema change. Just routing + a date comparison. Probably the single
most valuable in-country feature.

### C2. Offline cache of itinerary + map tiles

Service worker caches the active itinerary JSON and the Leaflet tiles along
the known route. Already hosted on Vercel, so most of the wiring is free;
the map tiles are the tricky part (OSM has usage policies — flag before
caching large tile volumes).

Non-trivial but self-contained. Probably a full day.

### C3. Group expense ledger

The classic group-trip pain point. Not full Splitwise — just enough:

- `expenses (id, itinerary_id, paid_by_user_id, amount_cents, currency,
  label, occurred_on, split_mode)`
- `expense_shares (expense_id, user_id, share_cents)` (generated from
  `split_mode` at write time so reading is simple)
- Running "who owes whom" computed client-side from the ledger

Deliberately no settlement tracking, no Venmo integration, no receipt
scanning. The group has iMessage for "I sent you €40".

Biggest new feature in this document. A solid weekend.

### C4. Shared photo moments per stop

This one contradicts CLAUDE.md ("no photo uploads — YouTube only"). Raising
it anyway because it's the natural in-country artefact and nobody wants to
maintain a YouTube upload per dinner.

Options, cheapest to heaviest:

- **Link-only** — paste a Google Photos / iCloud Shared Album URL per stop.
  Zero infra. Probably the right answer for a small group.
- **Uploads to an S3-compatible bucket** — real but real work: storage,
  thumbnails, lifecycle, auth. Weeks, not days. Not worth it for us.

Strong preference for link-only. If we build C4 at all, it's a single URL
field on `stops` (or a `media_links` polymorphic table if comments, videos,
and photo albums all want to live in one place — a small refactor we might
want anyway).

### C5. "I'm here" lightweight check-ins

Opt-in. Tap a button on a stop; it records `user_id`, `stop_id`, timestamp,
optional short note. Renders as little name dots on the overview map.

Not realtime (CLAUDE.md rules out sockets). A 30-second poll is fine. Works
as a low-key "Sezin just got to Firenze" signal without turning into Find My
Friends. Explicit opt-in per check-in, not always-on location.

### C6. Quick reactions on stops

A single 👍 or ❤️ per user per stop, addable once you've been there. Cheap
signal for the post-trip recap — "everyone loved Siena, nobody cared about
the gallery in Milano". Reuses the existing `votes` polymorphic shape.
Trivial.

### C7. Deep-link to WhatsApp / iMessage group

The group chat is going to live somewhere else — WhatsApp almost certainly.
Rather than building chat, just put a "jump to group chat" button in the
nav. One link, zero features. Acknowledges reality.

---

## D. After — the keepsake phase

### D1. Archive-to-scrapbook

When we flip the itinerary to `archived`, generate a single static page:
stops, photos (if C4), best comments, top-voted suggestions, the final
expense ledger summary. Read-only. Shareable via one URL. This is what
survives the project long-term.

Could be literally a server-rendered page with a print stylesheet. Cheap if
we already have the data; free brag sheet if we don't.

### D2. "A year ago today" email

Optional, opt-in. One email per person on the trip's first anniversary,
with a random stop and the comments from that day. Sentimental. Resend is
already wired up. Ten lines of code plus a cron.

Borderline feature-creep for a side project. Include only if we're still
opening the repo a year later — which, honestly, we might not be, and
that's fine.

---

## What's deliberately not on this list

- Realtime anything (WebSockets, SSE, live cursors) — CLAUDE.md
- AI trip suggestions / "Claude plans your day" — not the vibe of this
  project; Ozzie plans, friends react
- Booking integrations (Booking.com, Skyscanner APIs) — massive effort,
  tiny payoff, we can paste URLs
- Public sharing, SEO, a marketing site — private trip, not a product
- Native mobile app — PWA with `Add to Home Screen` covers 95% of it for
  free

## How to use this file

When we finish Phase 3, re-read this and pick a small number — probably two
or three — that actually matter for the lock-in phase. Ignore the rest
until the trip gets closer. Then do the same for countdown. Then for
in-country.

Most of these will never be built. That's the correct outcome for a
wishlist.
