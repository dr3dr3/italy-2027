import type { PromotionItinerary, WishlistRow } from "@/lib/queries/wishlist";
import type { CommentRow } from "@/lib/queries/comments";
import { WishlistItem } from "./wishlist-item";
import { WishlistForm } from "./wishlist-form";

export function WishlistSection({
  rows,
  comments,
  currentUserId,
  isEditor,
  promotionTargets,
}: {
  rows: WishlistRow[];
  comments: Map<number, CommentRow[]>;
  currentUserId: number | null;
  isEditor: boolean;
  promotionTargets: PromotionItinerary[];
}) {
  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-semibold">
        I desideri{" "}
        <span className="text-ink/40 text-xl font-normal">/ wishlist</span>
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Ideas for places to visit. Ozzie turns them into stops or day trips.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-base text-ink/70">
          Nothing on the wishlist. Unusual.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <WishlistItem
              key={row.id}
              row={row}
              comments={comments.get(row.id) ?? []}
              currentUserId={currentUserId}
              isEditor={isEditor}
              promotionTargets={promotionTargets}
            />
          ))}
        </ul>
      )}

      <div className="mt-4">
        <WishlistForm />
      </div>
    </section>
  );
}
