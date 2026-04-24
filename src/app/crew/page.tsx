import Link from "next/link";
import { auth } from "@/auth";
import { getCrew, type CrewMember } from "@/lib/queries/users";

const DAY_MS = 24 * 60 * 60 * 1000;

function presence(lastSeenAt: Date | null): { icon: string; quip: string } {
  if (!lastSeenAt) return { icon: "🌑", quip: "yet to show up" };
  const delta = Date.now() - lastSeenAt.getTime();
  if (delta < DAY_MS) return { icon: "☀️", quip: "popped in today" };
  if (delta < 7 * DAY_MS) return { icon: "⛅", quip: "swung by this week" };
  if (delta < 30 * DAY_MS) return { icon: "🌧️", quip: "dropped by recently" };
  return { icon: "🌫️", quip: "drifted off a while back" };
}

function activityLabel(total: number): { italian: string; english: string } {
  if (total === 0) return { italian: "Misterioso", english: "hasn't said a word" };
  if (total <= 3) return { italian: "Tranquillo", english: "easing in" };
  if (total <= 10) return { italian: "Presente", english: "showing up" };
  return { italian: "Leggenda", english: "running the show" };
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function CrewCard({
  member,
  isMe,
}: {
  member: CrewMember;
  isMe: boolean;
}) {
  const p = presence(member.lastSeenAt);
  const a = activityLabel(member.totalActions);
  const seenTitle = member.lastSeenAt
    ? member.lastSeenAt.toLocaleString()
    : "never signed in";

  return (
    <li className="animate-in rounded-lg border border-dust bg-white/85 p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-dust font-serif text-base font-semibold text-ink/70"
        >
          {initials(member.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-lg font-semibold">
              {member.name ?? "Someone"}
            </span>
            {isMe && (
              <span className="text-xs text-ink/40">— that&apos;s you</span>
            )}
          </div>
          <p
            className="mt-0.5 text-sm text-ink/60"
            title={seenTitle}
          >
            <span className="mr-1" aria-hidden="true">
              {p.icon}
            </span>
            {p.quip}
          </p>
        </div>
        <div className="flex-none text-right">
          <div className="font-serif text-base font-semibold text-ink/80">
            {a.italian}
          </div>
          <div className="text-xs text-ink/50">{a.english}</div>
        </div>
      </div>
    </li>
  );
}

export default async function CrewPage() {
  const [session, crew] = await Promise.all([auth(), getCrew()]);
  const meId = session?.user?.id ? Number(session.user.id) : null;

  return (
    <main className="min-h-screen px-6 py-12 text-ink">
      <div className="mx-auto max-w-3xl">
        <div className="animate-in flex items-center justify-end gap-4">
          <Link
            href="/"
            className="text-sm text-ink/60 hover:text-terracotta"
          >
            ← Home
          </Link>
        </div>

        <header className="animate-in mt-8 mb-8" style={{ animationDelay: "80ms" }}>
          <h1 className="font-serif text-4xl font-semibold">La combriccola</h1>
          <p className="mt-2 text-base text-ink/60">
            The crew <span className="text-ink/40">/ chi c&apos;è</span>
          </p>
        </header>

        <ul className="space-y-3">
          {crew.map((m) => (
            <CrewCard key={m.id} member={m} isMe={m.id === meId} />
          ))}
        </ul>

        <p className="mt-8 text-xs text-ink/40">
          Every comment, vote, suggestion, and video counts. No leaderboard,
          just who&apos;s chipping in.
        </p>
      </div>
    </main>
  );
}
