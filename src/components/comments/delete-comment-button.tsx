"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteComment } from "@/lib/actions/comments";

export function DeleteCommentButton({ commentId }: { commentId: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this comment?")) return;
        startTransition(async () => {
          const result = await deleteComment(commentId);
          if (!result.ok) toast.error(result.error);
        });
      }}
      className="text-xs text-ink/60 hover:text-wine disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
