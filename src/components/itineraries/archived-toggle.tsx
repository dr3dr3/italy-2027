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
    <div className="mt-12">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="font-serif italic text-base text-ink/55 hover:text-ink"
        aria-expanded={open}
      >
        {open ? "hide archived" : `view ${count} archived`} &rarr;
      </button>
      {open && <div className="mt-6 opacity-70">{children}</div>}
    </div>
  );
}
