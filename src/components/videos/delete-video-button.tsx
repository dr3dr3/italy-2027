"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteVideo } from "@/lib/actions/videos";

export function DeleteVideoButton({ videoId }: { videoId: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this video?")) return;
        startTransition(async () => {
          const result = await deleteVideo(videoId);
          if (!result.ok) toast.error(result.error);
        });
      }}
      className="text-xs text-ink/40 hover:text-wine disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
