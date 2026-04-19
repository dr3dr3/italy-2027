import { describeWindow, type PersonWindow } from "@/lib/participations";

export function OtherRow({ person }: { person: PersonWindow }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2 text-sm">
      <span className="font-medium text-ink">{person.name ?? "Someone"}</span>
      <span className="text-ink/70">· {describeWindow(person)}</span>
      {person.note && (
        <span className="text-ink/50 italic">· {person.note}</span>
      )}
    </li>
  );
}
