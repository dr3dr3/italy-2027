"use client";

import { useState, type ReactNode } from "react";

export function ArchivedToggle({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="py-1 text-sm text-ink/60 hover:text-ink"
        aria-expanded={open}
      >
        {open ? "Hide" : "Show"} archived ({count})
      </button>
      {open && <div className="mt-4 opacity-60">{children}</div>}
    </div>
  );
}
