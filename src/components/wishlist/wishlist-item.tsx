import type { WishlistRow } from "@/lib/queries/wishlist";
import { formatRelative } from "@/lib/dates";
import { DeleteWishlistButton } from "./delete-wishlist-button";

export function WishlistItem({
  row,
  currentUserId,
  isEditor,
}: {
  row: WishlistRow;
  currentUserId: number | null;
  isEditor: boolean;
}) {
  const canDelete =
    currentUserId !== null && (currentUserId === row.addedBy || isEditor);

  return (
    <li className="rounded-lg border border-dust bg-white/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold text-ink">
            {row.name}
          </h3>
          {row.description && (
            <p className="mt-1 text-sm text-ink/80 whitespace-pre-wrap">
              {row.description}
            </p>
          )}
          <p className="mt-2 text-xs text-ink/50">
            {row.authorName ?? "Someone"} · {formatRelative(row.createdAt)}
          </p>
        </div>
      </div>
      {canDelete && (
        <div className="mt-2 flex justify-end">
          <DeleteWishlistButton id={row.id} />
        </div>
      )}
    </li>
  );
}
