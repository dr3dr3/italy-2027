"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSuggestion } from "@/lib/actions/suggestions";

const KINDS = [
  { value: "attraction", label: "Attraction" },
  { value: "restaurant", label: "Restaurant" },
  { value: "sight", label: "Sight" },
  { value: "other", label: "Other" },
] as const;

const MAX_TITLE = 200;
const MAX_NOTES = 1000;

export function SuggestionForm({ stopId }: { stopId: number }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("attraction");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setKind("attraction");
    setTitle("");
    setUrl("");
    setNotes("");
  }

  function close() {
    reset();
    setOpen(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSuggestion(
        stopId,
        kind,
        title,
        url || undefined,
        notes || undefined,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      close();
      toast.success("Added.");
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-terracotta text-cream hover:bg-terracotta/90"
      >
        Suggest something
      </Button>
    );
  }

  const titleNearLimit = title.length > MAX_TITLE - 30;
  const titleTooLong = title.length > MAX_TITLE;
  const notesNearLimit = notes.length > MAX_NOTES - 100;
  const notesTooLong = notes.length > MAX_NOTES;
  const disabled =
    isPending ||
    title.trim().length === 0 ||
    titleTooLong ||
    notesTooLong;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-dust bg-white/60 p-4"
      suppressHydrationWarning
    >
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div className="space-y-1">
          <Label htmlFor={`kind-${stopId}`} className="text-xs">
            Kind
          </Label>
          <select
            id={`kind-${stopId}`}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            disabled={isPending}
            className="h-9 w-full rounded border border-dust bg-white px-2 text-sm text-ink focus:border-ink/40 outline-none"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`title-${stopId}`} className="text-xs">
            Title
          </Label>
          <Input
            id={`title-${stopId}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
            required
            placeholder="What do you reckon?"
            suppressHydrationWarning
          />
          {(titleNearLimit || titleTooLong) && (
            <p
              className={`text-xs ${titleTooLong ? "text-wine" : "text-ink/40"}`}
            >
              {title.length}/{MAX_TITLE}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`url-${stopId}`} className="text-xs">
          Link <span className="text-ink/40">(optional)</span>
        </Label>
        <Input
          id={`url-${stopId}`}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isPending}
          placeholder="https://…"
          suppressHydrationWarning
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`notes-${stopId}`} className="text-xs">
          Notes <span className="text-ink/40">(optional)</span>
        </Label>
        <textarea
          id={`notes-${stopId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          rows={3}
          placeholder="Why's this worth it?"
          className="w-full resize-y rounded border border-dust bg-white px-3 py-2 text-base text-ink outline-none placeholder:text-ink/40 focus:border-ink/40"
          suppressHydrationWarning
        />
        {(notesNearLimit || notesTooLong) && (
          <p
            className={`text-xs ${notesTooLong ? "text-wine" : "text-ink/40"}`}
          >
            {notes.length}/{MAX_NOTES}
          </p>
        )}
      </div>
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
          {isPending ? "Adding…" : "Add suggestion"}
        </Button>
      </div>
    </form>
  );
}
