# ADR 0004: Itinerary import via JSON-in-repo

**Status**: Accepted
**Date**: 2026-04-13

## Decision

Ozzie produces itineraries in freeform. These get converted to JSON (using Claude)
matching a defined shape, committed to `data/itineraries/<slug>.json`, and imported
into the database via an editor-gated `/admin/import` route that upserts into
`itineraries` and `stops`.

The full original JSON is kept in `itineraries.source_json` for traceability.

## Why

Git gives us free versioning of the canonical itineraries. Ozzie doesn't need to
learn a new tool. The import route keeps the DB as the source of truth for what the
app renders, while the repo is the source of truth for what was loaded. Round-tripping
is fine because edits post-import belong on the collaboration layer, not the canonical
layer.

## Alternatives considered

- **CMS (Sanity, Contentful)**: overkill and another service to manage
- **Edit JSON in an admin UI**: more code, and markdown-in-git is better for diffs
- **Airtable as source**: Ozzie doesn't need a spreadsheet UI for this
