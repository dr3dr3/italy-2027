"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { generatePrompt } from "@/lib/actions/prompt";
import type { PromptSignal } from "@/lib/queries/prompt-signal";

type Props = {
  initialSignal: PromptSignal;
  initialPrompt: string;
  version: string;
};

const COPY_TOASTS = [
  "Copied. Off to the AI you go.",
  "Copied. Buon viaggio.",
  "Copied.",
  "Copied.",
  "Kolay gelsin.",
];

export function PromptGenerator({ initialSignal, initialPrompt, version }: Props) {
  const [signal, setSignal] = useState(initialSignal);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showSignal, setShowSignal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refreshPrompt(nextStart: string, nextEnd: string) {
    startTransition(async () => {
      const result = await generatePrompt(nextStart || null, nextEnd || null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPrompt(result.prompt);
      setSignal(result.signal);
    });
  }

  function onStartDateChange(value: string) {
    setStartDate(value);
    refreshPrompt(value, endDate);
  }

  function onEndDateChange(value: string) {
    setEndDate(value);
    refreshPrompt(startDate, value);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      const msg = COPY_TOASTS[Math.floor(Math.random() * COPY_TOASTS.length)];
      toast.success(msg);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-dust bg-white/60 p-4">
        <button
          type="button"
          onClick={() => setShowSignal((s) => !s)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={showSignal}
        >
          <div>
            <h2 className="text-sm font-medium text-ink">What&apos;s going in</h2>
            <p className="mt-1 text-xs text-ink/60">
              {signal.group.length} people · {signal.wishlist.length} wishlist entries ·{" "}
              {signal.lovedStops.length} loved stops
            </p>
          </div>
          <span className="text-xs text-ink/50" aria-hidden>
            {showSignal ? "hide" : "show"}
          </span>
        </button>
        {showSignal && (
          <div className="mt-4 space-y-3 border-t border-dust pt-3 text-xs text-ink/70">
            <div>
              <p className="font-medium text-ink/80">Group</p>
              <p className="mt-1">
                {signal.group.map((u) => u.name).join(", ") || "(none)"}
              </p>
            </div>
            <div>
              <p className="font-medium text-ink/80">Wishlist</p>
              {signal.wishlist.length === 0 ? (
                <p className="mt-1 italic text-ink/50">None yet.</p>
              ) : (
                <ul className="mt-1 space-y-0.5">
                  {signal.wishlist.map((w) => (
                    <li key={w.name}>
                      {w.name}
                      {w.addedBy ? ` — ${w.addedBy}` : ""}
                      {w.voteCount > 0 ? ` · ${w.voteCount} ♥` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="font-medium text-ink/80">Loved stops</p>
              {signal.lovedStops.length === 0 ? (
                <p className="mt-1 italic text-ink/50">No votes on stops yet.</p>
              ) : (
                <ul className="mt-1 space-y-0.5">
                  {signal.lovedStops.map((s) => (
                    <li key={`${s.name}-${s.itineraryTitle}`}>
                      {s.name} · {s.voteCount} ♥
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-ink">Rough date window</h2>
          <p className="mt-1 text-xs text-ink/60">
            Optional. Leave blank if you want the AI to propose dates.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink/70">
            Arrive
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="rounded-md border border-dust bg-white/85 px-2 py-1.5 text-sm text-ink focus:border-terracotta focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink/70">
            Depart
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="rounded-md border border-dust bg-white/85 px-2 py-1.5 text-sm text-ink focus:border-terracotta focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs text-ink/60">
          Heads-up: this prompt lists every wishlist entry and who added it.
          You&apos;re pasting it into a third-party AI tool.
        </p>
        <div className="relative">
          <textarea
            value={prompt}
            readOnly
            spellCheck={false}
            aria-label="Generated prompt"
            className="block min-h-100 w-full rounded-md border border-dust bg-white/85 p-3 pr-3 font-mono text-xs text-ink/90 focus:border-terracotta focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
          />
          {isPending && (
            <span
              className="pointer-events-none absolute right-3 top-3 rounded bg-cream/90 px-2 py-0.5 text-[10px] font-medium text-ink/60"
              aria-hidden
            >
              updating…
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={copy}
            className="rounded-md bg-terracotta px-3 py-1.5 text-sm font-medium text-cream hover:opacity-90"
          >
            {copied ? "Copied" : "Copy prompt"}
          </button>
          <button
            type="button"
            onClick={() => refreshPrompt(startDate, endDate)}
            disabled={isPending}
            className="rounded-md border border-dust bg-white/85 px-3 py-1.5 text-sm font-medium text-ink/80 hover:bg-white disabled:opacity-50"
          >
            Refresh with latest wishlist
          </button>
        </div>
        <p className="text-xs text-ink/50">Prompt {version}</p>
      </section>
    </div>
  );
}
