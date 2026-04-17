ALTER TABLE "itineraries" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_slug_unique" UNIQUE("slug");