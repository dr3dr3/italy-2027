"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createComment } from "@/lib/actions/comments";
import type { CommentTargetType } from "@/lib/queries/comments";

const MAX_BODY = 2000;

export function CommentForm({
  targetType,
  targetId,
}: {
  targetType: CommentTargetType;
  targetId: number;
}) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const trimmed = body.trim();
  const tooLong = trimmed.length > MAX_BODY;
  const disabled = isPending || trimmed.length === 0 || tooLong;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createComment(targetType, targetId, body);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBody("");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 space-y-2"
      suppressHydrationWarning
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={isPending}
        rows={3}
        placeholder="Say something…"
        className="w-full resize-y rounded border border-dust bg-white/60 px-3 py-2 text-base text-ink outline-none placeholder:text-ink/40 focus:border-ink/40 focus:bg-white"
        suppressHydrationWarning
      />
      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${tooLong ? "text-wine" : "text-ink/40"}`}
        >
          {trimmed.length}/{MAX_BODY}
        </span>
        <Button
          type="submit"
          disabled={disabled}
          className="bg-terracotta text-cream hover:bg-terracotta/90"
        >
          {isPending ? "Posting…" : "Comment"}
        </Button>
      </div>
    </form>
  );
}
