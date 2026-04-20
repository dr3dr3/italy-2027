import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const email = "andre@maviblue.com";
  const users = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (users.length === 0) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }
  const userId = users[0].id;
  const token = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO sessions (session_token, user_id, expires)
    VALUES (${token}, ${userId}, ${expires.toISOString()})
  `;
  console.log(token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
