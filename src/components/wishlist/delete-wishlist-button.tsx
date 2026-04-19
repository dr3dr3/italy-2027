"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteWishlistDestination } from "@/lib/actions/wishlist";

export function DeleteWishlistButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this destination? Comments and votes go with it."))
          return;
        startTransition(async () => {
          const result = await deleteWishlistDestination(id);
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
