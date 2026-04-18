"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractYouTubeId } from "@/lib/youtube";
import { createVideo } from "@/lib/actions/videos";

const MAX_NOTE = 500;

export function VideoForm({
  stopId,
  isEmpty,
}: {
  stopId: number;
  isEmpty: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function close() {
    setUrl("");
    setNote("");
    setOpen(false);
  }

  const trimmedUrl = url.trim();
  const validId = trimmedUrl.length > 0 ? extractYouTubeId(trimmedUrl) : null;
  const urlInvalid = trimmedUrl.length > 0 && validId === null;
  const noteTooLong = note.length > MAX_NOTE;
  const disabled = isPending || !validId || noteTooLong;

  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createVideo(stopId, url, note || undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
      toast.success("Shared.");
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="text-sm text-terracotta hover:text-terracotta/80"
      >
        Share a video
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-dust bg-white p-4"
      suppressHydrationWarning
    >
      {isEmpty && (
        <p className="text-sm text-ink/50">
          No one&apos;s shared a video yet. Be the hero.
        </p>
      )}
      <div className="space-y-1">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isPending}
          required
          placeholder="Paste a YouTube link"
          suppressHydrationWarning
        />
        {urlInvalid && (
          <p className="text-xs text-wine">
            That doesn&apos;t look like a YouTube link.
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isPending}
          placeholder="What's this about?"
          suppressHydrationWarning
        />
        {note.length > MAX_NOTE - 50 && (
          <p
            className={`text-xs ${noteTooLong ? "text-wine" : "text-ink/40"}`}
          >
            {note.length}/{MAX_NOTE}
          </p>
        )}
      </div>
      {error && (
        <p className="text-sm text-wine">{error}</p>
      )}
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
          {isPending ? "Sharing…" : "Share"}
        </Button>
      </div>
    </form>
  );
}
