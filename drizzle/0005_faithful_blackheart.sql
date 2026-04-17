ALTER TABLE "stops" ADD COLUMN "place_key" text;--> statement-breakpoint
UPDATE "stops" SET "place_key" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'));--> statement-breakpoint
ALTER TABLE "stops" ALTER COLUMN "place_key" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "stops_place_key_idx" ON "stops" USING btree ("place_key");
