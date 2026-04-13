# Data model

Postgres on Neon. Drizzle ORM. All tables use `bigserial` ids unless noted.

## Tables

### `users`
Seeded manually. No self-signup.

| Column       | Type         | Notes                          |
|--------------|--------------|--------------------------------|
| id           | bigserial PK |                                |
| email        | text unique  | Allowlist — must match to log in |
| name         | text         | Display name                   |
| is_editor    | boolean      | Only Ozzie = true for now      |
| created_at   | timestamptz  | default now()                  |

### `itineraries`
Canonical layer. Only editors can create/edit/archive.

| Column       | Type         | Notes                                    |
|--------------|--------------|------------------------------------------|
| id           | bigserial PK |                                          |
| title        | text         | e.g. "Coastal loop via Amalfi"          |
| status       | text         | `draft` \| `active` \| `archived`       |
| source_json  | jsonb        | Original imported JSON, kept for record |
| created_at   | timestamptz  | default now()                            |
| updated_at   | timestamptz  | default now()                            |

### `stops`
Normalised from `source_json` on import.

| Column        | Type         | Notes                                |
|---------------|--------------|--------------------------------------|
| id            | bigserial PK |                                      |
| itinerary_id  | bigint FK    | → itineraries.id, on delete cascade  |
| day           | int          | 1-indexed day number                 |
| order_in_day  | int          | Sort order within a day              |
| name          | text         | e.g. "Firenze"                       |
| description   | text         | Optional blurb                       |
| lat           | numeric      | For map pin                          |
| lng           | numeric      | For map pin                          |
| arrive_date   | date         | Calendar date, no timezone           |
| depart_date   | date         | Calendar date, no timezone           |

### `comments`
Polymorphic — attaches to itinerary, stop, or suggestion.

| Column       | Type         | Notes                                |
|--------------|--------------|--------------------------------------|
| id           | bigserial PK |                                      |
| user_id      | bigint FK    | → users.id                           |
| target_type  | text         | `itinerary` \| `stop` \| `suggestion`|
| target_id    | bigint       | ID in the referenced table           |
| body         | text         | Flat, no threading                   |
| created_at   | timestamptz  |                                      |

### `votes`
Polymorphic. One row per (user, target). Upsert on change.

| Column       | Type         | Notes                                |
|--------------|--------------|--------------------------------------|
| id           | bigserial PK |                                      |
| user_id      | bigint FK    |                                      |
| target_type  | text         | `itinerary` \| `stop` \| `suggestion`|
| target_id    | bigint       |                                      |
| value        | int          | `1` = upvote; extend later if needed |
| created_at   | timestamptz  |                                      |

Unique index on `(user_id, target_type, target_id)`.

### `suggestions`
Group wishlist for things to do at each stop.

| Column        | Type         | Notes                                   |
|---------------|--------------|-----------------------------------------|
| id            | bigserial PK |                                         |
| stop_id       | bigint FK    | → stops.id                              |
| user_id       | bigint FK    | → users.id — who suggested it          |
| kind          | text         | `attraction` \| `restaurant` \| `sight` \| `other` |
| title         | text         |                                         |
| url           | text         | Optional link                           |
| notes         | text         | Optional blurb                          |
| is_confirmed  | boolean      | Editor-only flag. "We're doing this."  |
| created_at    | timestamptz  |                                         |

### `videos`
YouTube links shared against a stop. Store URL, render embed.

| Column       | Type         | Notes                     |
|--------------|--------------|---------------------------|
| id           | bigserial PK |                           |
| stop_id      | bigint FK    |                           |
| user_id      | bigint FK    |                           |
| youtube_url  | text         |                           |
| note         | text         | Optional one-liner        |
| created_at   | timestamptz  |                           |

## Import flow

1. Ozzie sends itinerary in any format (doc, email, prose)
2. Run it through Claude → produces JSON matching the `source_json` shape
3. Commit JSON to `data/itineraries/<slug>.json`
4. Hit `/admin/import` (editor-gated) → upserts into `itineraries` + `stops`

JSON shape:

```json
{
  "title": "Coastal loop via Amalfi",
  "status": "draft",
  "stops": [
    {
      "day": 1,
      "order_in_day": 1,
      "name": "Roma",
      "description": "Land, settle in, gelato recon.",
      "lat": 41.9028,
      "lng": 12.4964,
      "arrive_date": "2027-05-12",
      "depart_date": "2027-05-14"
    }
  ]
}
```
