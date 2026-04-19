import type { PersonWindow } from "@/lib/participations";
import { ParticipationRow } from "./participation-row";

export function ParticipationsSection({
  itineraryId,
  people,
  currentUserId,
  tripStart,
  tripEnd,
}: {
  itineraryId: number;
  people: PersonWindow[];
  currentUserId: number | null;
  tripStart: string | null;
  tripEnd: string | null;
}) {
  return (
    <section
      className="animate-in mb-10"
      style={{ animationDelay: "200ms" }}
    >
      <h2 className="font-serif text-2xl font-semibold">
        Chi viene{" "}
        <span className="text-ink/40 text-xl font-normal">/ who&apos;s coming</span>
      </h2>
      <ul className="mt-4 divide-y divide-dust/70 rounded-lg border border-dust bg-white/85">
        {people.map((p) => (
          <ParticipationRow
            key={p.userId}
            itineraryId={itineraryId}
            person={p}
            isMe={p.userId === currentUserId}
            tripStart={tripStart}
            tripEnd={tripEnd}
          />
        ))}
      </ul>
    </section>
  );
}
