"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteVisit } from "@/lib/actions/visits";

export function DeleteVisitButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this visit?")) return;
        startTransition(async () => {
          const result = await deleteVisit(id);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          router.refresh();
        });
      }}
      className="text-xs text-ink/40 hover:text-wine disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
