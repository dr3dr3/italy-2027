CREATE TABLE "visits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"stop_id" bigint NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"lat" numeric,
	"lng" numeric,
	"visit_date" date,
	"order_in_leg" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_destinations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"added_by" bigint NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"lat" numeric,
	"lng" numeric,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_destinations" ADD CONSTRAINT "wishlist_destinations_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visits_stop_id_idx" ON "visits" USING btree ("stop_id");--> statement-breakpoint
CREATE INDEX "wishlist_added_by_idx" ON "wishlist_destinations" USING btree ("added_by");--> statement-breakpoint
CREATE INDEX "wishlist_status_idx" ON "wishlist_destinations" USING btree ("status");