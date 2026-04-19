import {
  pgTable,
  bigserial,
  bigint,
  text,
  boolean,
  integer,
  numeric,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isEditor: boolean("is_editor").notNull().default(false),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const itineraries = pgTable("itineraries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  sourceJson: jsonb("source_json"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stops = pgTable(
  "stops",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    itineraryId: bigint("itinerary_id", { mode: "number" })
      .notNull()
      .references(() => itineraries.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    orderInDay: integer("order_in_day").notNull(),
    name: text("name").notNull(),
    placeKey: text("place_key").notNull(),
    description: text("description"),
    lat: numeric("lat"),
    lng: numeric("lng"),
    arriveDate: date("arrive_date"),
    departDate: date("depart_date"),
  },
  (t) => [
    index("stops_itinerary_id_idx").on(t.itineraryId),
    index("stops_place_key_idx").on(t.placeKey),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    targetType: text("target_type").notNull(),
    targetId: bigint("target_id", { mode: "number" }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("comments_user_id_idx").on(t.userId),
    index("comments_target_idx").on(t.targetType, t.targetId),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    targetType: text("target_type").notNull(),
    targetId: bigint("target_id", { mode: "number" }).notNull(),
    value: integer("value").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("votes_user_target_unique").on(
      t.userId,
      t.targetType,
      t.targetId,
    ),
    index("votes_target_idx").on(t.targetType, t.targetId),
  ],
);

export const suggestions = pgTable(
  "suggestions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    stopId: bigint("stop_id", { mode: "number" })
      .notNull()
      .references(() => stops.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    notes: text("notes"),
    isConfirmed: boolean("is_confirmed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("suggestions_stop_id_idx").on(t.stopId),
    index("suggestions_user_id_idx").on(t.userId),
  ],
);

export const videos = pgTable(
  "videos",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    stopId: bigint("stop_id", { mode: "number" })
      .notNull()
      .references(() => stops.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    youtubeUrl: text("youtube_url").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("videos_stop_id_idx").on(t.stopId),
    index("videos_user_id_idx").on(t.userId),
  ],
);

export const visits = pgTable(
  "visits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    stopId: bigint("stop_id", { mode: "number" })
      .notNull()
      .references(() => stops.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    lat: numeric("lat"),
    lng: numeric("lng"),
    visitDate: date("visit_date"),
    orderInLeg: integer("order_in_leg").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("visits_stop_id_idx").on(t.stopId)],
);

export const participations = pgTable(
  "participations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    itineraryId: bigint("itinerary_id", { mode: "number" })
      .notNull()
      .references(() => itineraries.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinsOn: date("joins_on"),
    departsOn: date("departs_on"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("participations_itinerary_user_unique").on(
      t.itineraryId,
      t.userId,
    ),
    index("participations_itinerary_id_idx").on(t.itineraryId),
  ],
);

export const wishlistDestinations = pgTable(
  "wishlist_destinations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    addedBy: bigint("added_by", { mode: "number" })
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    description: text("description"),
    lat: numeric("lat"),
    lng: numeric("lng"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("wishlist_added_by_idx").on(t.addedBy),
    index("wishlist_status_idx").on(t.status),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Itinerary = typeof itineraries.$inferSelect;
export type NewItinerary = typeof itineraries.$inferInsert;
export type Stop = typeof stops.$inferSelect;
export type NewStop = typeof stops.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type Suggestion = typeof suggestions.$inferSelect;
export type NewSuggestion = typeof suggestions.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type WishlistDestination = typeof wishlistDestinations.$inferSelect;
export type NewWishlistDestination = typeof wishlistDestinations.$inferInsert;
export type Participation = typeof participations.$inferSelect;
export type NewParticipation = typeof participations.$inferInsert;
