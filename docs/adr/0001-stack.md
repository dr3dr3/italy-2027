# ADR 0001: Stack

**Status**: Accepted
**Date**: 2026-04-13

## Decision

Next.js (App Router) + TypeScript on Vercel, Neon Postgres accessed via Drizzle ORM,
Auth.js v5 with magic links delivered by Resend, Tailwind + shadcn/ui for styling,
Leaflet with OpenStreetMap for maps, pnpm as package manager.

## Why

All free tier, all well-documented, all well-understood by AI coding assistants.
Next.js + Vercel + Neon is the shortest path from zero to deployed. Auth.js with
magic links removes password handling entirely. shadcn/ui gives us primitives without
committing to a heavy component library. Leaflet + OSM avoids map API keys and billing.

## Alternatives considered

- **SvelteKit**: equally good but Next.js has better AI-assisted dev support right now
- **Supabase**: would bundle auth + DB, but Neon is already on hand and Auth.js + Resend
  is a cleaner separation
- **Airtable as backend**: rate limits, no real auth, coarse permissions — more work,
  not less
- **Cloudflare Pages + D1**: viable, but Vercel + Neon is more turnkey for this stack
