# Claude Code brief — italy-2027

You are helping build a small collaborative trip planner for a group of six friends
going to Italy in 2027. This is a side project, not a product. Optimise for **simple,
fun, and done**, not for scale, reusability, or enterprise patterns.

## Who this is for

Six people, all known, all seeded directly in the database. No public signup.
One of them (Ozzie) is the editor and owns the canonical itineraries. The other
five collaborate via comments, votes, suggestions, and shared videos.

## Stack — do not deviate without asking

- **Framework**: Next.js (App Router), TypeScript, React Server Components where sensible
- **Database**: Neon Postgres, accessed via `@neondatabase/serverless` or Drizzle ORM
- **Auth**: Auth.js (NextAuth v5) with magic link provider, emails via Resend
- **Styling**: Tailwind CSS + shadcn/ui primitives only
- **Map**: Leaflet with OpenStreetMap tiles, via `react-leaflet`
- **Hosting**: Vercel
- **Package manager**: pnpm

No Redux, no tRPC, no GraphQL, no component libraries beyond shadcn/ui, no CSS-in-JS.
Server actions for mutations. Plain `fetch` or direct DB calls for reads.

## Data model

See [`docs/data-model.md`](./docs/data-model.md) for the full schema. Key points:

- **Canonical layer** (`itineraries`, `stops`) — Ozzie owns, imported from JSON in `data/itineraries/`
- **Collaboration layer** (`comments`, `votes`, `suggestions`, `videos`) — everyone writes
- `comments` and `votes` are polymorphic via `target_type` + `target_id`
- `suggestions.is_confirmed` — set by editor only, means "we're doing this"
- Itineraries have status: `draft` | `active` | `archived`. Usually 2–3 active at once.
- Dates on stops are `date` not `timestamptz` — they're calendar facts, not moments

## Phases

We're building in phases. Don't jump ahead.

- **Phase 1 — skeleton**: Next.js scaffold, Neon connected, Auth.js magic links working,
  6 users seeded, one itinerary hardcoded from JSON, list + detail views, no collaboration yet.
- **Phase 2 — collaboration**: comments, votes, suggestions with thumbs-ups and confirm,
  YouTube embeds.
- **Phase 3 — map + polish**: Leaflet map per itinerary, multi-itinerary support with
  archive, admin import route, favourite-itinerary voting.
- **Phase 4 — TBD**: we'll decide after phase 2.

## Voice & tone — this is important, read carefully

The vibe is fun, dry, Aussie, with hidden Turkish and Italian easter eggs. But humour
goes in **specific slots only**. Functional UI stays crisp and trustworthy.

**Serious, no jokes:**
- Nav, form labels, buttons ("Save", "Add comment", "Archive")
- Error messages at decision points
- Confirmation dialogs for destructive actions
- Anything the user needs to trust

**Humour lives here:**
- Empty states ("Crickets. Say something.")
- Loading states (occasionally — not every time)
- Toast notifications (maybe 1 in 3 is playful)
- 404 and error pages
- Page section subtitles (light Italian flavour)

**Aussie voice calibration:**
- Dry, not cartoonish. No "g'day mate," no "throw a shrimp on the barbie."
- "Yeah nah," "reckon," "fair dinkum," "drongo," "chocka," "crook," "no wuckas" — sparingly
- Think Chris Lilley dry, not Steve Irwin loud

**Turkish easter eggs — maximum 4–5 across the whole app:**
- Login page tagline rotation includes "Gözün aydın" with hover tooltip
- 404 page uses "Nerede?" as heading
- 1-in-10 "confirm suggestion" toast says "Afiyet olsun"
- `// kolay gelsin` as a comment at the top of `app/layout.tsx`

**Italian flavour:**
- Page section headings can use Italian with English subtitle: "Il Piano / The plan"
- Don't overdo it. Not every section needs an Italian name.

**The golden rule**: predictable humour isn't funny. If every button is a joke, none of
them are. Keep most of the UI boring so the jokes land when they appear.

## Design system

See [`design-system.md`](./design-system.md). Summary:

- Palette: ink, cream, terracotta, olive, dust, wine (CSS vars in `globals.css`)
- Fonts: Fraunces (headings), Inter (body/UI) — both Google Fonts
- Spacing: 4px base unit
- Minimal shadows, subtle rounding, flat and modern
- Tailwind classes should map to the CSS variables, not hardcode hex values

**When building any component, check `design-system.md` first.** Consistency across
sessions matters more than local cleverness.

## Things to avoid

- Don't generalise "trip" into a reusable concept — this is for Italy 2027 only
- Don't add features not in the current phase
- Don't invent new colours, fonts, or spacing values
- Don't add notifications, email digests, or realtime features
- Don't add comment threading, @mentions, or reactions beyond thumbs-ups
- Don't add photo uploads — videos are YouTube URL embeds only
- Don't add tests unless explicitly asked (we're deliberately skipping TDD here)
- Don't refactor working code unless asked
- Don't install packages without flagging it first
- Don't add per-stop database queries inside the render loop on the detail
  page — all data is fetched at page level and passed as props. See the
  comment in `/itineraries/[slug]/page.tsx`.

## When in doubt

Ask. This project is small enough that 30 seconds of clarification beats 30 minutes
of rework. If a request is ambiguous, propose the simplest interpretation and ask
before building.
