"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { importItinerary } from "@/lib/actions/import";

type ValidateResult =
  | { kind: "none" }
  | { kind: "ok"; summary: string }
  | { kind: "error"; message: string };

type ImportOutcome =
  | { kind: "none" }
  | { kind: "ok"; detail: string }
  | { kind: "error"; message: string };

export function ItineraryImport() {
  const [json, setJson] = useState("");
  const [validation, setValidation] = useState<ValidateResult>({ kind: "none" });
  const [outcome, setOutcome] = useState<ImportOutcome>({ kind: "none" });
  const [isPending, startTransition] = useTransition();

  function validate() {
    setOutcome({ kind: "none" });
    try {
      const parsed = JSON.parse(json);
      const slug = typeof parsed?.slug === "string" ? parsed.slug : "(derived from title)";
      const stopCount = Array.isArray(parsed?.stops) ? parsed.stops.length : 0;
      setValidation({
        kind: "ok",
        summary: `${stopCount} stops across ${slug}.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown parse error.";
      setValidation({ kind: "error", message: msg });
    }
  }

  function submit() {
    if (validation.kind !== "ok") return;
    startTransition(async () => {
      const result = await importItinerary(json);
      if (!result.ok) {
        setOutcome({ kind: "error", message: result.error });
        toast.error(result.error);
        return;
      }
      const detail = result.detail ?? "Imported.";
      setOutcome({ kind: "ok", detail });
      toast.success(detail);
    });
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setJson(e.target.value);
    // Invalidate prior validation on every change.
    setValidation({ kind: "none" });
    setOutcome({ kind: "none" });
  }

  return (
    <div className="space-y-4">
      <textarea
        value={json}
        onChange={onChange}
        spellCheck={false}
        placeholder='{ "title": "…", "status": "draft", "stops": [ … ] }'
        className="block min-h-100 w-full rounded-md border border-dust bg-white/85 p-3 font-mono text-sm text-ink focus:border-terracotta focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={validate}
          disabled={json.trim().length === 0}
          className="rounded-md border border-dust bg-white/85 px-3 py-1.5 text-sm font-medium text-ink/80 hover:bg-white disabled:opacity-50"
        >
          Validate
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={validation.kind !== "ok" || isPending}
          className="rounded-md bg-terracotta px-3 py-1.5 text-sm font-medium text-cream hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Importing…" : "Import"}
        </button>
      </div>

      {validation.kind === "ok" && (
        <p className="text-sm text-olive">✓ Valid. {validation.summary}</p>
      )}
      {validation.kind === "error" && (
        <p className="text-sm text-wine">{validation.message}</p>
      )}

      {outcome.kind === "ok" && (
        <div className="rounded-md border border-olive/40 bg-olive/10 p-3 text-sm text-ink">
          {outcome.detail}
        </div>
      )}
      {outcome.kind === "error" && (
        <div className="rounded-md border border-wine/40 bg-wine/10 p-3 text-sm text-ink">
          {outcome.message}
        </div>
      )}
    </div>
  );
}
