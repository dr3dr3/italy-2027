import type { WishlistRow } from "@/lib/queries/wishlist";
import type { CommentRow } from "@/lib/queries/comments";
import { formatRelative } from "@/lib/dates";
import { VoteButton } from "@/components/votes/vote-button";
import { CommentThread } from "@/components/comments/comment-thread";
import { DeleteWishlistButton } from "./delete-wishlist-button";
import { WishlistCommentsToggle } from "./wishlist-comments-toggle";

export function WishlistItem({
  row,
  comments,
  currentUserId,
  isEditor,
}: {
  row: WishlistRow;
  comments: CommentRow[];
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
        </div>
        <VoteButton
          targetType="wishlist_destination"
          targetId={row.id}
          count={row.voteCount}
          userHasVoted={row.userHasVoted}
          label={row.name}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dust/70 pt-2 text-xs text-ink/50">
        <WishlistCommentsToggle count={row.commentCount}>
          <CommentThread
            targetType="wishlist_destination"
            targetId={row.id}
            initialRows={comments}
            currentUserId={currentUserId}
          />
        </WishlistCommentsToggle>
        <span className="flex-1 truncate">
          {row.authorName ?? "Someone"} · {formatRelative(row.createdAt)}
        </span>
        {canDelete && <DeleteWishlistButton id={row.id} />}
      </div>
    </li>
  );
}
