# Plan: in-app stop editor

A first-pass plan for letting Ozzie edit individual stops without
re-importing JSON. Iterate freely — every section has open questions
flagged.

## Why this matters

Today the round-trip for fixing a stop description, tweaking a date, or
nudging lat/lng is: edit `data/itineraries/<slug>.json` locally, run the
admin import, deploy. That's painful for typos and small refinements.
The point of this feature is to compress that loop to "click → type →
save" while we're still in the planning phase.

## Out of scope this round

To keep the change small and avoid crossing too many constraints at
once:

- **Adding or removing stops.** Schema-shape changes stay JSON-driven.
- **Reordering stops within a day, or moving across days.** Same
  reason — touches order_in_day across siblings.
- **Editing itinerary metadata** (title, status, span). `status` already
  has its own control. The rest is rare enough to keep JSON-driven.
- **Bulk edits.** One stop at a time.
- **Edit history / undo.** No new tables, no audit trail. Last write wins.
- **Place-key changes.** `place_key` ties same-place stops across
  itineraries (videos span this); editing it could orphan content.
  Treat it as immutable for v1.

If we want any of these later, they can be follow-ups.

## What's editable

| Field          | Editable in v1? | Notes                                      |
|----------------|-----------------|--------------------------------------------|
| `name`         | yes             | Display label only                         |
| `description`  | yes             | The blurb on the detail page               |
| `arrive_date`  | yes             | Date input, must precede `depart_date`     |
| `depart_date`  | yes             | Date input, must follow `arrive_date`      |
| `lat`          | yes             | Numeric, optional (some stops have no pin) |
| `lng`          | yes             | Numeric, optional (must come with lat)     |
| `day`          | no              | Reordering is out of scope                 |
| `order_in_day` | no              | Same                                       |
| `place_key`    | no              | Stable identifier across itineraries       |

**Open question**: do we expose `lat` / `lng` as raw numbers, or as a
single "Paste a Google Maps link" affordance that we parse server-side?
The latter is friendlier but adds a parsing step. My lean: skip the
parser in v1, expose two number inputs with a small "decimal degrees,
e.g. 41.9028" hint.

## Tension: JSON canonical layer

Today CLAUDE.md says: "Canonical layer (itineraries, stops) — Ozzie
owns, imported from JSON in `data/itineraries/`." Once we edit a stop
in-app, that statement becomes partially false — the database row has
diverged from the JSON file.

Options for resolving the tension:

- **(A) Promote DB to source of truth.** JSON imports become "starter
  templates" useful for greenfield itineraries; in-app edits are
  authoritative thereafter. Re-importing the same JSON would clobber
  in-app edits, so we add a confirmation on the import action ("This
  itinerary has been edited in-app — overwrite?"). **My recommendation.**
- **(B) Track per-field dirty bits.** Each stop column gets a sibling
  `*_edited_at` flag; re-imports skip dirty fields. Cleaner separation
  but doubles the schema and adds bookkeeping for very rare imports.
- **(C) Bidirectional.** Save in-app edits back to the JSON file via a
  server action that writes the file. Ergonomic but couples the runtime
  to the working tree, breaks on Vercel where the FS is read-only, and
  re-introduces the round-trip we're trying to remove.

**Open question**: pick A, B, or C. I lean strongly A.

## Permissions

Same gate as today: `session?.user?.isEditor === true`. Non-editors see
the stop in display-only mode and never see edit affordances. The
server action enforces this independently — no relying on the UI to
hide the door.

## UX pattern

**My recommendation: inline edit on the detail page, gated by a single
"Edit" affordance per stop.**

Flow:

1. Each stop's `<article>` has an `Edit ✎` link in the metadata row,
   visible only when `isEditor`. Looks the same as `Manage ▾` — quiet.
2. Clicking expands an inline editor in place: name, description, two
   dates, two lat/lng inputs. Form sits where the description usually
   is, pushes the rest of the stop content (videos, suggestions, etc.)
   below.
3. `Save` and `Cancel` buttons. Save → optimistic update → server
   action → on failure roll back and surface error.
4. On save, server action calls `revalidatePath(itinerary.slug)` to
   refresh the page-level data fetch.

Why inline rather than a modal or a separate page:

- Keeps Ozzie in context — you're reading a stop, you fix it, you move
  on.
- Doesn't compete with the editorial layout; the form looks like a
  "draft mode" of the same stop.
- No new route, no double-fetching of the surrounding page.

**Alternative considered**: per-stop edit page at
`/itineraries/[slug]/stops/[id]/edit`. Cleaner separation but feels
heavyweight for a 4-field form. Skip unless a v2 needs it.

**Open question**: should `Edit` also appear on the home page's
itinerary card (so Ozzie can fix a typo without entering the detail
page)? My lean: no — entering the stop's context is the right
reflection point before editing.

## Validation

Server-side first, mirrored client-side for fast feedback:

- `name`: trimmed, 1–120 chars.
- `description`: 0–2,000 chars (today's stops are well under this).
- `arrive_date`: required when departing, ISO `YYYY-MM-DD`.
- `depart_date`: required when arriving, must be `>=` arrive_date.
- `lat`: optional, between -90 and 90.
- `lng`: optional, between -180 and 180. Both lat and lng must be
  present together — no half pins.
- Dates must stay within the itinerary's overall span derived from
  other stops, OR the user gets a confirmation: "this stop will extend
  the trip span — proceed?" **Open question** on whether we enforce
  this or warn.

Server-side errors return `{ ok: false, error: string }` per the
existing pattern in `src/lib/actions/`.

## State, optimistic UI, revalidation

Pattern matches the rest of the app:

- `useTransition` + `useOptimistic` for inline-feel.
- Server action `updateStop(id, payload)`:
  1. `auth()` + editor check.
  2. Validate payload.
  3. `db.update(stops).set(...).where(eq(stops.id, id))`.
  4. `revalidatePath(`/itineraries/${slug}`)` — needs the slug, so the
     action fetches the itinerary's slug from the stop row OR the call
     site passes it in. **Open question**: which? Passing it in is one
     fewer query but adds a parameter the caller can lie about; we
     re-fetch in the action either way, so I'd just look it up.
  5. Return `{ ok: true }`.

If we worry about concurrent edits (two editors at once), we can add a
`row_version` int that increments on each update and have the action
fail when it doesn't match. **Open question**: skip for v1?

## What this changes for re-imports

Assuming option A (DB as source of truth):

1. Admin import flow gets a confirmation step when importing a slug
   that has at least one stop with `updated_at > created_at` (i.e.
   has been edited in-app). Copy: "This itinerary has been edited
   in-app since import. Overwrite all stops?"
2. JSON files become living records of the most-recent canonical
   import. They're useful for greenfield itineraries and as a fallback
   if the DB needs reseeding.
3. Optionally, an "Export to JSON" button on the detail page that
   downloads the current DB state as a JSON file in the import format.
   Lets Ozzie commit edits back to source if he wants. **My lean: skip
   for v1; revisit if Ozzie actually wants it.**

We'd need a `stops.updated_at` column for this — schema change. Today
the table only has columns up to `depart_date`. Open question on
whether we want this column at all in v1; if not, the confirmation
above can't be safely shown, and re-imports just clobber silently.

## Schema change required (if any)

Smallest path: add `stops.updated_at timestamptz default now() not null`
that auto-updates on row update via a `BEFORE UPDATE` trigger or a
manual `set({ updatedAt: new Date() })` in the action.

If we skip the import-overwrite confirmation, no schema change is
needed.

**Open question**: do we want the `updated_at` column? My lean: yes,
small migration, and it's the kind of thing we'll regret not having
later.

## Decisions to make before coding

- [ ] Pick canonical-layer model: A, B, or C above (lean A)
- [ ] Add `stops.updated_at` column? (lean yes)
- [ ] Add import-overwrite confirmation? (depends on previous answer)
- [ ] Lat/lng as raw numbers, or paste-a-link parser? (lean numbers)
- [ ] Date-span enforcement: hard-block out-of-span dates, or warn and
      proceed? (lean warn)
- [ ] Concurrency guard via `row_version`? (lean skip for v1)
- [ ] "Export to JSON" button? (lean skip for v1)
- [ ] Edit affordance on the home page card too? (lean no)

## Estimated scope

- 1 schema migration (~5 mins) + drizzle generate + drizzle migrate
- 1 server action `updateStop` in `src/lib/actions/stops.ts` (new file)
- 1 client component `<EditStopForm />` in
  `src/components/stops/edit-stop-form.tsx` (new dir)
- 1 small component `<StopEditToggle />` to flip an article between
  display and edit
- ~30 lines of changes to `app/itineraries/[slug]/page.tsx` to wire it
  up
- Optional: confirmation modal in admin import action — ~10 lines

Total: ~1 day of focused work end-to-end including verification.
