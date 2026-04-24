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
      <div className="flex items-baseline gap-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
          Chi viene
        </p>
        <span className="text-ink/25" aria-hidden="true">·</span>
        <p className="font-serif text-base italic text-ink/60">
          who&apos;s coming
        </p>
      </div>
      {allFullTrip && (
        <p className="mt-2 font-serif text-sm italic text-ink/55">
          Tutti a bordo. Change yours below if it&rsquo;s not.
        </p>
      )}

      <div className="mt-5 space-y-3">
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
