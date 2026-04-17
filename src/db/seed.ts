import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { users } from "./schema";

const seedUsers = [
  { email: "ozlem.guneri1@gmail.com", name: "Ozzie", isEditor: true },
  { email: "andre@maviblue.com", name: "Andre", isEditor: false },
  { email: "ozlemonat@hotmail.com", name: "Özlem", isEditor: false },
  { email: "ari.tatonyan@gmail.com", name: "Ari", isEditor: false },
  { email: "dani@example.com", name: "Dani", isEditor: false },
  { email: "robin@example.com", name: "Robin", isEditor: false },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (check .env.local)");
  }
  const client = neon(process.env.DATABASE_URL);
  const db = drizzle(client);

  const [{ count: before }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  await db.insert(users).values(seedUsers).onConflictDoNothing({
    target: users.email,
  });

  const [{ count: after }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const inserted = after - before;
  if (inserted === 0) {
    console.log(`Users already present, skipping (${after} in table).`);
  } else {
    console.log(`Seeded ${inserted} user${inserted === 1 ? "" : "s"}.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
