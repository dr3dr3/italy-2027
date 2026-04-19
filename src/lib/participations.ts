import { formatDay, formatRange } from "@/lib/dates";
import type { ParticipationRow, TripMate } from "@/lib/queries/participations";

export type PersonWindow = {
  userId: number;
  name: string | null;
  joinsOn: string | null;
  departsOn: string | null;
  note: string | null;
};

export function buildPeopleList(
  mates: TripMate[],
  participations: Map<number, ParticipationRow>,
): PersonWindow[] {
  return mates.map((m) => {
    const row = participations.get(m.id);
    return {
      userId: m.id,
      name: m.name,
      joinsOn: row?.joinsOn ?? null,
      departsOn: row?.departsOn ?? null,
      note: row?.note ?? null,
    };
  });
}

export function describeWindow(p: PersonWindow): string {
  if (p.joinsOn && p.departsOn) return formatRange(p.joinsOn, p.departsOn);
  if (p.joinsOn) return `Joining ${formatDay(p.joinsOn)}`;
  if (p.departsOn) return `Leaving ${formatDay(p.departsOn)}`;
  return "Full trip";
}

type StopLike = {
  id: number;
  arriveDate: string | null;
  departDate: string | null;
};

export function isAbsentFromStop(p: PersonWindow, stop: StopLike): boolean {
  if (p.joinsOn === null && p.departsOn === null) return false;
  if (p.joinsOn !== null && stop.departDate !== null && stop.departDate < p.joinsOn) {
    return true;
  }
  if (p.departsOn !== null && stop.arriveDate !== null && stop.arriveDate > p.departsOn) {
    return true;
  }
  return false;
}

export function computeAbsenteesByStop(
  stops: StopLike[],
  people: PersonWindow[],
): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const s of stops) {
    const absent: string[] = [];
    for (const p of people) {
      if (isAbsentFromStop(p, s)) absent.push(p.name ?? "Someone");
    }
    if (absent.length > 0) out.set(s.id, absent);
  }
  return out;
}
