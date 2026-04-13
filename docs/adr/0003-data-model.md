# ADR 0003: Canonical vs collaborative data layers

**Status**: Accepted
**Date**: 2026-04-13

## Decision

Two distinct layers in the schema:

- **Canonical layer** (`itineraries`, `stops`): owned by the editor, imported from JSON,
  read-only for everyone else.
- **Collaboration layer** (`comments`, `votes`, `suggestions`, `videos`): everyone writes.

Comments and votes are polymorphic (`target_type` + `target_id`) so they can attach
to itineraries, stops, or suggestions without proliferating tables.

Itineraries have `status` (`draft` / `active` / `archived`) and usually 2–3 are active
at once. Collaboration rows hang off specific itineraries, not a global trip, so old
discussions stay with old itineraries.

## Why

Separating layers means Ozzie can re-import or spin up new itinerary versions without
worrying about stomping user content. Polymorphic comments and votes keep the schema
small and the queries uniform. Per-itinerary collaboration avoids confusing users when
Ozzie revises plans.

## Alternatives considered

- **One itinerary, mutable**: doesn't match how Ozzie is actually working — she's
  iterating on alternatives
- **Separate comment tables per target**: more tables, more code, no real benefit at
  this scale
  