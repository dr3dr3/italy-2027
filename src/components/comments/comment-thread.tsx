import { auth } from "@/auth";
import {
  getCommentsFor,
  type CommentRow,
  type CommentTargetType,
} from "@/lib/queries/comments";
import { Comment } from "./comment";
import { CommentForm } from "./comment-form";

/**
 * `initialRows` / `currentUserId` are optional: pre-fetched by the page to
 * avoid N+1 when many threads are rendered under client toggles.
 * Fallback behaviour (no props) fetches on its own — still valid for one-off
 * uses like the bottom-of-page itinerary thread where batching isn't useful.
 */
export async function CommentThread({
  targetType,
  targetId,
  initialRows,
  currentUserId: currentUserIdProp,
}: {
  targetType: CommentTargetType;
  targetId: number;
  initialRows?: CommentRow[];
  currentUserId?: number | null;
}) {
  let rows: CommentRow[];
  let currentUserId: number | null;
  if (initialRows !== undefined && currentUserIdProp !== undefined) {
    rows = initialRows;
    currentUserId = currentUserIdProp;
  } else {
    const session = await auth();
    currentUserId = session?.user?.id ? Number(session.user.id) : null;
    rows = await getCommentsFor(targetType, targetId);
  }

  return (
    <div>
      {rows.length === 0 ? (
        <p className="text-sm text-ink/50">Crickets. Say something.</p>
      ) : (
        <ul className="divide-y divide-dust/70">
          {rows.map((c) => (
            <li key={c.id}>
              <Comment comment={c} currentUserId={currentUserId} />
            </li>
          ))}
        </ul>
      )}
      <CommentForm targetType={targetType} targetId={targetId} />
    </div>
  );
}
