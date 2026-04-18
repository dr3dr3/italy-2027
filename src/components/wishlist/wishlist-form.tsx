"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWishlistDestination } from "@/lib/actions/wishlist";

const MAX_NAME = 200;
const MAX_DESCRIPTION = 1000;

export function WishlistForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName("");
    setDescription("");
    setError(null);
  }

  function close() {
    reset();
    setOpen(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createWishlistDestination(
        name,
        description || undefined,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
      toast.success("On the list.");
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-terracotta text-cream hover:bg-terracotta/90"
      >
        Add a destination
      </Button>
    );
  }

  const nameNearLimit = name.length > MAX_NAME - 30;
  const nameTooLong = name.length > MAX_NAME;
  const descNearLimit = description.length > MAX_DESCRIPTION - 100;
  const descTooLong = description.length > MAX_DESCRIPTION;
  const disabled =
    isPending || name.trim().length === 0 || nameTooLong || descTooLong;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-dust bg-white p-4"
      suppressHydrationWarning
    >
      <div className="space-y-1">
        <Label htmlFor="wishlist-name" className="text-xs">
          Destination
        </Label>
        <Input
          id="wishlist-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          required
          placeholder="Palermo, or somewhere in Sicily"
          suppressHydrationWarning
        />
        {(nameNearLimit || nameTooLong) && (
          <p className={`text-xs ${nameTooLong ? "text-wine" : "text-ink/40"}`}>
            {name.length}/{MAX_NAME}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="wishlist-description" className="text-xs">
          Why <span className="text-ink/40">(optional)</span>
        </Label>
        <textarea
          id="wishlist-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={3}
          placeholder="What's the pitch?"
          className="w-full resize-y rounded border border-dust bg-white px-3 py-2 text-base text-ink outline-none placeholder:text-ink/40 focus:border-ink/40"
          suppressHydrationWarning
        />
        {(descNearLimit || descTooLong) && (
          <p className={`text-xs ${descTooLong ? "text-wine" : "text-ink/40"}`}>
            {description.length}/{MAX_DESCRIPTION}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-wine">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={close}
          disabled={isPending}
          className="text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={disabled}
          className="bg-terracotta text-cream hover:bg-terracotta/90"
        >
          {isPending ? "Adding…" : "Add to wishlist"}
        </Button>
      </div>
    </form>
  );
}
