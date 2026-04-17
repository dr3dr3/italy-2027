CREATE TABLE "comments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"target_type" text NOT NULL,
	"target_id" bigint NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"itinerary_id" bigint NOT NULL,
	"day" integer NOT NULL,
	"order_in_day" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"lat" numeric,
	"lng" numeric,
	"arrive_date" date,
	"depart_date" date
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"stop_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"notes" text,
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"is_editor" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"stop_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"youtube_url" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"target_type" text NOT NULL,
	"target_id" bigint NOT NULL,
	"value" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stops" ADD CONSTRAINT "stops_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_user_id_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_target_idx" ON "comments" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "stops_itinerary_id_idx" ON "stops" USING btree ("itinerary_id");--> statement-breakpoint
CREATE INDEX "suggestions_stop_id_idx" ON "suggestions" USING btree ("stop_id");--> statement-breakpoint
CREATE INDEX "suggestions_user_id_idx" ON "suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "videos_stop_id_idx" ON "videos" USING btree ("stop_id");--> statement-breakpoint
CREATE INDEX "videos_user_id_idx" ON "videos" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_user_target_unique" ON "votes" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "votes_target_idx" ON "votes" USING btree ("target_type","target_id");