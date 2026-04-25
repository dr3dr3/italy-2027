"use server";

import { cookies } from "next/headers";

const COOKIE_NAME = "homeSeenAt";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

/**
 * Records "now" as the user's last home-page visit. Read on the next visit
 * to compute "what's new since you were here." Cookie-based — no DB row
 * needed and survives only as long as the user keeps the cookie.
 */
export async function markHomeSeen() {
  const store = await cookies();
  store.set(COOKIE_NAME, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_S,
    path: "/",
  });
}

export const HOME_SEEN_COOKIE = COOKIE_NAME;
