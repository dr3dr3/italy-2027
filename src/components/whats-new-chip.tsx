"use client";

import { useEffect } from "react";
import { markHomeSeen } from "@/lib/actions/home-seen";
import type { ActivityCounts } from "@/lib/queries/activity";

/**
 * Pure display: shows the "Da quando sei stato qui" line when there's new
 * activity, hides itself otherwise. The cookie that drives "since when"
 * is updated by `<MarkHomeSeen />`, which the home page renders
 * unconditionally so the window is always advanced.
 */
export function WhatsNewChip({
  counts,
  since,
}: {
  counts: ActivityCounts;
  since: Date;
}) {
  const total = counts.comments + counts.suggestions + counts.videos;
  if (total === 0) return null;

  const parts: string[] = [];
  if (counts.comments > 0) {
    parts.push(
      `${counts.comments} ${counts.comments === 1 ? "comment" : "comments"}`,
    );
  }
  if (counts.suggestions > 0) {
    parts.push(
      `${counts.suggestions} ${
        counts.suggestions === 1 ? "suggestion" : "suggestions"
      }`,
    );
  }
  if (counts.videos > 0) {
    parts.push(
      `${counts.videos} ${counts.videos === 1 ? "video" : "videos"}`,
    );
  }

  return (
    <div className="animate-in mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink/65">
      <span className="text-[10px] uppercase tracking-[0.22em] text-ink/45">
        Da quando sei stato qui
      </span>
      <span className="text-ink/25" aria-hidden="true">
        ·
      </span>
      <span className="font-serif italic">{parts.join(" · ")}</span>
      <span className="text-xs text-ink/40">since {formatSince(since)}</span>
    </div>
  );
}

function formatSince(d: Date): string {
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays < 1) return "earlier today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "a week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return "a month ago";
  return `${Math.floor(diffDays / 30)} months ago`;
}

/** Fires once on mount; the home page renders this regardless of whether
 *  there's a chip to show. */
export function MarkHomeSeen() {
  useEffect(() => {
    markHomeSeen();
  }, []);
  return null;
}
