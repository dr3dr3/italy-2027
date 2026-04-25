"use server";

import { cookies } from "next/headers";

const ONE_YEAR_S = 60 * 60 * 24 * 365;

/**
 * Records "now" as the user's last home-page visit. Read on the next visit
 * to compute "what's new since you were here." Cookie-based — no DB row
 * needed and survives only as long as the user keeps the cookie.
 *
 * The cookie name is duplicated in the home page reader; "use server" files
 * may only export async functions, so the constant can't live here.
 */
export async function markHomeSeen() {
  const store = await cookies();
  store.set("homeSeenAt", new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_S,
    path: "/",
  });
}
