import type { StopVisits } from "@/lib/queries/visits";
import { formatDay } from "@/lib/dates";
import { DeleteVisitButton } from "./delete-visit-button";

/**
 * Renders the two visit buckets for a stop as inline subsections of the
 * stop card. Daytrips sit under the stop; enroute visits describe the
 * drive leaving this stop toward `nextStopName` — which is null for the
 * final stop (in which case there shouldn't be any enroute visits anyway).
 */
export function VisitsSection({
  visits,
  nextStopName,
  isEditor,
}: {
  visits: StopVisits;
  nextStopName: string | null;
  isEditor: boolean;
}) {
  const { daytrips, enroute } = visits;
  if (daytrips.length === 0 && enroute.length === 0) return null;

  return (
    <div className="mt-4 border-t border-dust/70 pt-3 space-y-4">
      {daytrips.length > 0 && (
        <div>
          <h5 className="font-serif text-sm font-semibold text-ink/80">
            Day trips
          </h5>
          <ul className="mt-2 space-y-2">
            {daytrips.map((v) => (
              <VisitRow key={v.id} v={v} isEditor={isEditor} />
            ))}
          </ul>
        </div>
      )}
      {enroute.length > 0 && (
        <div>
          <h5 className="font-serif text-sm font-semibold text-ink/80">
            {nextStopName ? `On the drive to ${nextStopName}` : "On the drive"}
          </h5>
          <ul className="mt-2 space-y-2">
            {enroute.map((v) => (
              <VisitRow key={v.id} v={v} isEditor={isEditor} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function VisitRow({
  v,
  isEditor,
}: {
  v: StopVisits["daytrips"][number];
  isEditor: boolean;
}) {
  return (
    <li className="rounded border border-dust/70 bg-white/60 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-medium text-ink">{v.name}</span>
            {v.visitDate && (
              <span className="text-xs text-ink/50">
                {formatDay(v.visitDate)}
              </span>
            )}
          </div>
          {v.description && (
            <p className="mt-1 text-sm text-ink/70 whitespace-pre-wrap">
              {v.description}
            </p>
          )}
        </div>
        {isEditor && <DeleteVisitButton id={v.id} />}
      </div>
    </li>
  );
}
