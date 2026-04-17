import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const DATA_DIR = join(process.cwd(), "data", "itineraries");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (check .env.local)");
  }

  // Dynamic import so @/db only evaluates after dotenv has loaded.
  const { importItineraryFromJson } = await import("../lib/import");

  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log(`No JSON files found in ${DATA_DIR}.`);
    return;
  }

  let inserted = 0;
  let updated = 0;
  let totalStops = 0;

  for (const file of files) {
    const path = join(DATA_DIR, file);
    const raw = JSON.parse(readFileSync(path, "utf8"));
    // Preserve the filename-based slug convention for CLI imports.
    if (!raw.slug) raw.slug = basename(file, ".json");

    const result = await importItineraryFromJson(raw);
    if (!result.ok) {
      console.error(`  ✗ ${file}: ${result.error}`);
      continue;
    }
    if (result.created) inserted++;
    else updated++;
    totalStops += result.stopCount;
    console.log(
      `  ${result.created ? "inserted" : "updated"} ${result.slug} (${result.stopCount} stops)`,
    );
  }

  console.log(
    `\nDone. inserted: ${inserted}, updated: ${updated}, total stops: ${totalStops}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
