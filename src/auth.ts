import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { Resend as ResendClient } from "resend";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

const EMAIL_FROM = process.env.AUTH_EMAIL_FROM!;
const RESEND_KEY = process.env.AUTH_RESEND_KEY!;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // NOTE: the Drizzle adapter's TS types assume string user ids (text/varchar/uuid),
  // but our users.id is bigserial. Runtime is fine — ids round-trip as numbers from
  // Drizzle and the adapter treats them as opaque. Casting to bypass strict types.
  adapter: DrizzleAdapter(db, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    usersTable: users as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accountsTable: accounts as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionsTable: sessions as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verificationTokensTable: verificationTokens as any,
  }),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    Resend({
      apiKey: RESEND_KEY,
      from: EMAIL_FROM,
      async sendVerificationRequest({ identifier: email, url, provider }) {
        // Allowlist: silently no-op for unknown emails so membership isn't leaked.
        const [found] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        if (!found) {
          console.log(`[auth] allowlist miss for ${email} — no email sent`);
          return;
        }
        const resend = new ResendClient(provider.apiKey!);
        const { error } = await resend.emails.send({
          from: provider.from!,
          to: email,
          subject: "Your Italia 2027 sign-in link",
          text: `Sign in to Italia 2027:\n\n${url}\n\nIf you didn't ask for this, ignore it.`,
          html: magicLinkEmail(url),
        });
        if (error) {
          throw new Error(`Resend send failed: ${JSON.stringify(error)}`);
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) {
        console.log("[auth] signIn rejected: no email on user");
        return false;
      }
      const needle = user.email.toLowerCase().trim();
      const [found] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, needle))
        .limit(1);
      if (!found) {
        console.log(`[auth] signIn rejected: "${needle}" not in allowlist`);
        return false;
      }
      console.log(`[auth] signIn allowed: ${found.email}`);
      return true;
    },
    async session({ session, user }) {
      if (!session.user) return session;
      const [row] = await db
        .select({
          id: users.id,
          name: users.name,
          isEditor: users.isEditor,
          lastSeenAt: users.lastSeenAt,
        })
        .from(users)
        .where(eq(users.email, user.email!))
        .limit(1);
      if (row) {
        session.user.id = String(row.id);
        session.user.name = row.name ?? undefined;
        session.user.isEditor = row.isEditor;
        // Throttle presence touches — avoids slamming the DB on every auth() call.
        const last = row.lastSeenAt?.getTime() ?? 0;
        if (Date.now() - last > 60_000) {
          await db
            .update(users)
            .set({ lastSeenAt: new Date() })
            .where(eq(users.id, row.id));
        }
      }
      return session;
    },
  },
});

function magicLinkEmail(url: string) {
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, Inter, sans-serif; background: #faf7f2; color: #1a1a1a; padding: 32px;">
    <div style="max-width: 480px; margin: 0 auto; background: #fff; border: 1px solid #e8e2d5; border-radius: 8px; padding: 32px;">
      <h1 style="font-family: Fraunces, Georgia, serif; font-size: 24px; margin: 0 0 16px;">Italia 2027</h1>
      <p style="margin: 0 0 16px;">Click to sign in:</p>
      <p style="margin: 0 0 24px;">
        <a href="${url}" style="display: inline-block; background: #c65d3a; color: #faf7f2; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">Sign in</a>
      </p>
      <p style="margin: 0; color: #6b7a3f; font-size: 12px;">If you didn't ask for this, ignore it.</p>
    </div>
  </body>
</html>`;
}
