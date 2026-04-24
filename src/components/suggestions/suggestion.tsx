import { formatRelative } from "@/lib/dates";
import { formatUrlForDisplay } from "@/lib/url";
import { VoteButton } from "@/components/votes/vote-button";
import { CommentThread } from "@/components/comments/comment-thread";
import type { SuggestionRow } from "@/lib/queries/suggestions";
import type { CommentRow } from "@/lib/queries/comments";
import { ConfirmToggleButton } from "./confirm-toggle-button";
import { ConvertToVisitControl } from "./convert-to-visit-control";
import { DeleteSuggestionButton } from "./delete-suggestion-button";
import { SuggestionCommentsToggle } from "./suggestion-comments-toggle";

export function Suggestion({
  s,
  comments,
  currentUserId,
  isEditor,
}: {
  s: SuggestionRow;
  comments: CommentRow[];
  currentUserId: number | null;
  isEditor: boolean;
}) {
  const canDelete =
    currentUserId !== null && (s.userId === currentUserId || isEditor);

  return (
    <div
      className={`rounded-lg border p-4 ${
        s.isConfirmed ? "border-olive/30 bg-olive/10" : "border-dust bg-white/85"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-dust px-1.5 py-0.5 text-xs text-ink/70">
              {s.kind}
            </span>
            {s.isConfirmed && (
              <span className="inline-flex items-center gap-1 rounded bg-olive/15 px-1.5 py-0.5 text-xs font-medium text-olive">
                ✓ Confirmed
              </span>
            )}
            <h5 className="text-base font-medium text-ink">{s.title}</h5>
          </div>
          {s.url && (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-terracotta hover:underline"
            >
              {formatUrlForDisplay(s.url)}
            </a>
          )}
          {s.notes && (
            <p className="mt-2 text-sm text-ink/80">{s.notes}</p>
          )}
        </div>
        <VoteButton
          targetType="suggestion"
          targetId={s.id}
          count={s.voteCount}
          userHasVoted={s.userHasVoted}
          label={s.title}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dust/70 pt-2 text-xs text-ink/50">
        <SuggestionCommentsToggle count={s.commentCount}>
          <CommentThread
            targetType="suggestion"
            targetId={s.id}
            initialRows={comments}
            currentUserId={currentUserId}
          />
        </SuggestionCommentsToggle>
        <span className="flex-1 truncate">
          {s.authorName ?? "Anon"} · {formatRelative(s.createdAt)}
        </span>
        {isEditor && (
          <ConfirmToggleButton
            suggestionId={s.id}
            isConfirmed={s.isConfirmed}
          />
        )}
        {canDelete && <DeleteSuggestionButton suggestionId={s.id} />}
      </div>
      {isEditor && (
        <ConvertToVisitControl
          suggestionId={s.id}
          defaultName={s.title}
          defaultDescription={[s.notes ?? "", s.url ?? ""]
            .filter((v) => v.length > 0)
            .join("\n\n")}
        />
      )}
    </div>
  );
}
