"use client";

import { useState, type ReactNode } from "react";

/**
 * Toggle-able client shell for the stop-level comment thread.
 * The thread itself is a server component rendered into `children`;
 * we just flip visibility so we don't bounce to the server on expand.
 */
export function StopCommentsToggle({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const label =
    count === 0
      ? "Comment"
      : `${count} comment${count === 1 ? "" : "s"}`;

  return (
    <div className="mt-4 border-t border-dust/70 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-ink/60 hover:text-ink"
        aria-expanded={open}
      >
        <span className="mr-1 inline-block w-3">{open ? "▾" : "▸"}</span>
        {label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
