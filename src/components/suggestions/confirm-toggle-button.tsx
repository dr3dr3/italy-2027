"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleSuggestionConfirmed } from "@/lib/actions/suggestions";

export function ConfirmToggleButton({
  suggestionId,
  isConfirmed,
}: {
  suggestionId: number;
  isConfirmed: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const wasConfirmed = isConfirmed;
      const result = await toggleSuggestionConfirmed(suggestionId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (wasConfirmed) {
        toast.success("Back on the wishlist.");
      } else {
        // 1-in-10 Turkish easter egg.
        toast.success(Math.random() < 0.1 ? "Afiyet olsun." : "Locked in.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={
        isConfirmed
          ? "text-xs text-ink/50 hover:text-ink disabled:opacity-50"
          : "text-xs font-medium text-olive hover:text-olive/80 disabled:opacity-50"
      }
    >
      {isPending ? "…" : isConfirmed ? "Un-confirm" : "Confirm"}
    </button>
  );
}
