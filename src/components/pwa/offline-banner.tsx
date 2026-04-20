"use client";

import { useOnline } from "@/hooks/use-online";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-terracotta px-4 py-1.5 text-center text-xs font-medium text-cream"
    >
      You&apos;re offline. Viewing cached pages — new comments and votes are paused.
    </div>
  );
}
