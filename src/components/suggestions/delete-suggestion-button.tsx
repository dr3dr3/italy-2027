"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteSuggestion } from "@/lib/actions/suggestions";

export function DeleteSuggestionButton({
  suggestionId,
}: {
  suggestionId: number;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (
          !confirm("Delete this suggestion? Comments and votes go with it.")
        )
          return;
        startTransition(async () => {
          const result = await deleteSuggestion(suggestionId);
          if (!result.ok) toast.error(result.error);
        });
      }}
      className="text-xs text-ink/60 hover:text-wine disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
