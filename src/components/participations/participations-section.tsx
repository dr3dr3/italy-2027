import { isCustomWindow, type PersonWindow } from "@/lib/participations";
import type { PrefillCandidate } from "@/lib/queries/participations";
import { YourRow } from "./your-row";
import { OtherRow } from "./other-row";
import { FullTripReveal } from "./full-trip-reveal";

export function ParticipationsSection({
  itineraryId,
  people,
  currentUserId,
  prefill,
  tripStart,
  tripEnd,
}: {
  itineraryId: number;
  people: PersonWindow[];
  currentUserId: number | null;
  prefill: PrefillCandidate | null;
  tripStart: string | null;
  tripEnd: string | null;
}) {
  const you =
    currentUserId !== null
      ? people.find((p) => p.userId === currentUserId) ?? null
      : null;
  const others = people.filter((p) => p.userId !== currentUserId);
  const customOthers = others.filter(isCustomWindow);
  const fullTripOthers = others.filter((p) => !isCustomWindow(p));

  const allFullTrip =
    customOthers.length === 0 && (you === null || !isCustomWindow(you));

  return (
    <section className="animate-in mb-10" style={{ animationDelay: "200ms" }}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-serif text-2xl font-semibold">
          Chi viene{" "}
          <span className="text-ink/50 text-xl font-normal">
            / who&apos;s coming
          </span>
        </h2>
        {allFullTrip && (
          <p className="text-sm text-ink/50 italic">
            Tutti a bordo. Change yours below if it&rsquo;s not.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {you && (
          <YourRow
            itineraryId={itineraryId}
            person={you}
            prefill={prefill}
            tripStart={tripStart}
            tripEnd={tripEnd}
          />
        )}

        {customOthers.length > 0 && (
          <ul className="divide-y divide-dust/70 rounded-lg border border-dust bg-white/60">
            {customOthers.map((p) => (
              <OtherRow key={p.userId} person={p} />
            ))}
          </ul>
        )}

        <FullTripReveal fullTripOthers={fullTripOthers} />
      </div>
    </section>
  );
}
