"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleVote } from "@/lib/actions/votes";
import type { TargetType } from "@/lib/polymorphic";

type State = { count: number; userHasVoted: boolean };

export function VoteButton({
  targetType,
  targetId,
  count,
  userHasVoted,
  label,
}: {
  targetType: TargetType;
  targetId: number;
  count: number;
  userHasVoted: boolean;
  /** Optional accessible name — defaults to "Vote". */
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<State, void>(
    { count, userHasVoted },
    (curr) => ({
      count: curr.userHasVoted ? curr.count - 1 : curr.count + 1,
      userHasVoted: !curr.userHasVoted,
    }),
  );

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      setOptimistic();
      const result = await toggleVote(targetType, targetId);
      if (!result.ok) toast.error(result.error);
      // On success, revalidatePath refreshes the server-rendered parent with
      // new `count`/`userHasVoted` props — React reconciles optimistic → actual.
    });
  }

  const filled = optimistic.userHasVoted;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label={label ? `Vote for ${label}` : "Vote"}
      aria-pressed={filled}
      className={[
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-all duration-200",
        filled
          ? "border-terracotta bg-terracotta text-cream hover:bg-terracotta/90 scale-105"
          : "border-dust bg-white/85 text-ink/70 hover:border-ink/30 hover:text-ink scale-100",
        "active:scale-95 disabled:opacity-70",
      ].join(" ")}
    >
      <Heart
        className="size-4"
        fill={filled ? "currentColor" : "none"}
        strokeWidth={filled ? 0 : 2}
      />
      <span className="tabular-nums">{optimistic.count}</span>
    </button>
  );
}
