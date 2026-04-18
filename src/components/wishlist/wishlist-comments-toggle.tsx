"use client";

import { useState, type ReactNode } from "react";

export function WishlistCommentsToggle({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const label = count === 0 ? "Comment" : `${count} comment${count === 1 ? "" : "s"}`;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-ink/60 hover:text-ink"
        aria-expanded={open}
      >
        <span className="mr-1 inline-block w-3">{open ? "▾" : "▸"}</span>
        {label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </>
  );
}
