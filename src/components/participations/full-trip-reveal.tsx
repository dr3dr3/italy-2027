"use client";

import { useState } from "react";

export function FullTripReveal({
  fullTripOthers,
}: {
  fullTripOthers: Array<{ userId: number; name: string | null }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = fullTripOthers.length;
  if (count === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="py-1 text-xs text-ink/60 hover:text-ink"
        aria-expanded={expanded}
      >
        {expanded
          ? "Hide"
          : `${count} on the full trip · Show`}
      </button>
      {expanded && (
        <ul className="mt-2 grid gap-y-1 gap-x-4 text-sm text-ink/70 sm:grid-cols-2">
          {fullTripOthers.map((p) => (
            <li key={p.userId}>{p.name ?? "Someone"}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
