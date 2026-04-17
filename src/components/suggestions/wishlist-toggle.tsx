"use client";

import { useState, type ReactNode } from "react";

export function WishlistToggle({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const label = count === 0 ? "Suggest" : `${count} suggestion${count === 1 ? "" : "s"}`;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-ink/60 hover:text-ink"
        aria-expanded={open}
      >
        <span className="mr-1 inline-block w-3">{open ? "▾" : "▸"}</span>
        {label}
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}
