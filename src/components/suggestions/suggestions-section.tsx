import type { SuggestionRow } from "@/lib/queries/suggestions";
import type { CommentRow } from "@/lib/queries/comments";
import { Suggestion } from "./suggestion";
import { SuggestionForm } from "./suggestion-form";
import { WishlistToggle } from "./wishlist-toggle";

export function SuggestionsSection({
  stopId,
  suggestions,
  suggestionComments,
  currentUserId,
  isEditor,
}: {
  stopId: number;
  suggestions: SuggestionRow[];
  suggestionComments: Map<number, CommentRow[]>;
  currentUserId: number | null;
  isEditor: boolean;
}) {
  const confirmed = suggestions.filter((s) => s.isConfirmed);
  const wishlist = suggestions.filter((s) => !s.isConfirmed);

  return (
    <div className="mt-4 border-t border-dust/70 pt-3">
      {confirmed.length > 0 && (
        <div className="mb-4">
          <h5 className="font-serif text-sm font-semibold text-ink/80">
            Confirmed plans
          </h5>
          <div className="mt-2 space-y-3">
            {confirmed.map((s) => (
              <Suggestion
                key={s.id}
                s={s}
                comments={suggestionComments.get(s.id) ?? []}
                currentUserId={currentUserId}
                isEditor={isEditor}
              />
            ))}
          </div>
        </div>
      )}

      <WishlistToggle count={wishlist.length}>
        {wishlist.length === 0 ? (
          <p className="text-sm text-ink/50">
            No one&apos;s put their hand up yet.
          </p>
        ) : (
          wishlist.map((s) => (
            <Suggestion
              key={s.id}
              s={s}
              comments={suggestionComments.get(s.id) ?? []}
              currentUserId={currentUserId}
              isEditor={isEditor}
            />
          ))
        )}
        <SuggestionForm stopId={stopId} />
      </WishlistToggle>
    </div>
  );
}
