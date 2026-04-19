export function AbsenteePill({ absentees }: { absentees: string[] }) {
  if (absentees.length === 0) return null;
  const names =
    absentees.length === 1
      ? absentees[0]
      : absentees.length === 2
        ? `${absentees[0]} and ${absentees[1]}`
        : `${absentees.slice(0, -1).join(", ")} and ${absentees[absentees.length - 1]}`;
  return (
    <p className="mt-2 text-xs text-ink/50">
      Not here: <span className="text-ink/70">{names}</span>
    </p>
  );
}
