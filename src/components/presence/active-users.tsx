import type { ActivePresence } from "@/lib/queries/users";

export function ActiveUsers({
  presences,
  currentUserId,
}: {
  presences: ActivePresence[];
  currentUserId: number | null;
}) {
  const others = presences.filter((p) => p.id !== currentUserId);
  if (others.length === 0) return null;
  const names = others
    .map((p) => p.name ?? "Someone")
    .join(", ");
  return (
    <p className="mt-2 text-sm text-ink/50">
      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-olive align-middle" />
      Also around: {names}
    </p>
  );
}
