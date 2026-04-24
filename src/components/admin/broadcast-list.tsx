"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { BroadcastEvent } from "@/lib/queries/broadcast";

type Event = BroadcastEvent extends infer T
  ? T extends { at: Date }
    ? Omit<T, "at"> & { at: string }
    : never
  : never;

type Props = {
  events: Event[];
  baseUrl: string;
};

const COPY_TOASTS = [
  "Copied. Paste away.",
  "Copied.",
  "Copied.",
  "Copied. Over to WhatsApp.",
  "Kolay gelsin.",
];

export function BroadcastList({ events, baseUrl }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-dust bg-white/40 px-6 py-10 text-center">
        <p className="font-serif text-lg text-ink/80">Silenzio.</p>
        <p className="mt-1 text-sm text-ink/60">
          Nothing worth shouting about this week.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={`${e.kind}-${e.id}`}>
          <EventCard event={e} baseUrl={baseUrl} />
        </li>
      ))}
    </ul>
  );
}

function EventCard({ event, baseUrl }: { event: Event; baseUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildMessage(event, baseUrl));
      setCopied(true);
      toast.success(COPY_TOASTS[Math.floor(Math.random() * COPY_TOASTS.length)]);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    }
  }

  return (
    <article className="rounded-md border border-dust bg-white/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <TypePill kind={event.kind} />
            <span className="text-xs text-ink/50">{relativeTime(event.at)}</span>
          </div>
          <h3 className="mt-2 font-serif text-lg text-ink">
            {headline(event)}
          </h3>
          <p className="mt-1 text-sm text-ink/70">
            {event.itineraryTitle} · Day {event.stopDay} · {event.stopName}
            {event.authorName ? ` · ${event.authorName}` : ""}
          </p>
          {event.kind === "video" && (
            <p className="mt-1 truncate text-xs text-ink/50">
              {event.youtubeUrl}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md bg-terracotta px-3 py-1.5 text-sm font-medium text-cream hover:opacity-90"
        >
          {copied ? "Copied" : "Copy for WhatsApp"}
        </button>
      </div>
    </article>
  );
}

function TypePill({ kind }: { kind: Event["kind"] }) {
  const config = {
    confirmation: { label: "Confirmed", cls: "bg-olive/15 text-olive" },
    suggestion: { label: "Suggested", cls: "bg-dust text-ink/70" },
    video: { label: "Video", cls: "bg-terracotta/15 text-terracotta" },
  }[kind];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${config.cls}`}
    >
      {config.label}
    </span>
  );
}

function headline(e: Event): string {
  if (e.kind === "video") return e.note?.trim() || "New video";
  return e.title;
}

function buildMessage(e: Event, baseUrl: string): string {
  const url = `${baseUrl}/itineraries/${e.itinerarySlug}#stop-${e.stopId}`;
  const where = `${e.itineraryTitle}, day ${e.stopDay} (${e.stopName})`;
  const who = e.authorName ?? "Someone";

  if (e.kind === "confirmation") {
    return `*${e.title}*\nWe're doing this one — ${where}.\n${url}`;
  }
  if (e.kind === "suggestion") {
    return `*${e.title}*\n${who} suggested this for ${where}.\n${url}`;
  }
  const note = e.note?.trim();
  const lead = note ? `*${note}*\n` : "";
  return `${lead}${who} shared a video — ${where}.\n${url}`;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
