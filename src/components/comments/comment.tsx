import { formatRelative } from "@/lib/dates";
import type { CommentRow } from "@/lib/queries/comments";
import { DeleteCommentButton } from "./delete-comment-button";

export function Comment({
  comment,
  currentUserId,
}: {
  comment: CommentRow;
  currentUserId: number | null;
}) {
  const mine = currentUserId !== null && comment.userId === currentUserId;
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-ink">
            {comment.userName ?? "Anon"}
          </span>
          <span className="text-xs text-ink/50">
            {formatRelative(comment.createdAt)}
          </span>
        </div>
        {mine && <DeleteCommentButton commentId={comment.id} />}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-base text-ink/80">
        {comment.body}
      </p>
    </div>
  );
}
