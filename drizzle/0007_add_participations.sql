CREATE TABLE "participations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"itinerary_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"joins_on" date,
	"departs_on" date,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participations_itinerary_user_unique" ON "participations" USING btree ("itinerary_id","user_id");--> statement-breakpoint
CREATE INDEX "participations_itinerary_id_idx" ON "participations" USING btree ("itinerary_id");