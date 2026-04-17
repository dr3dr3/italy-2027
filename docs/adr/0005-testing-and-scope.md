# ADR 0005: Testing and scope discipline

**Status**: Accepted
**Date**: 2026-04-13

## Decision

No automated tests for this project. No TDD. Manual testing only. Scope is
deliberately frozen to the four phases in `CLAUDE.md`; out-of-scope features
(notifications, photo uploads, comment threading, reusability across trips) are
explicitly rejected and documented here so future-us doesn't relitigate them.

## Why

Six users, low stakes, short lifespan. The time cost of writing and maintaining tests
outweighs the bug cost on a project this small. TDD practice is better done on a
project where the test suite will outlive the learning exercise. Scope discipline is
the real risk on side projects, not code quality.

## Explicitly out of scope

- Notifications of any kind (WhatsApp group already exists)
- Photo uploads (YouTube URL embeds only)
- Comment threading, @mentions, reactions beyond thumbs-ups
- Calendar export
- Generalising "trip" as a reusable entity
- Realtime sync
- Mobile apps — responsive web only

## Revisit

If the trip gets postponed or the group wants to keep using it beyond Italy, revisit
ADR 0005 before adding features.
