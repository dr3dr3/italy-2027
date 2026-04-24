"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertSuggestionToVisit } from "@/lib/actions/suggestions";

type Kind = "daytrip" | "enroute";

export function ConvertToVisitForm({
  suggestionId,
  defaultName,
  defaultDescription,
  onClose,
}: {
  suggestionId: number;
  defaultName: string;
  defaultDescription: string;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>("daytrip");
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await convertSuggestionToVisit({
        suggestionId,
        kind,
        name,
        description: description || undefined,
        lat,
        lng,
        visitDate: visitDate || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Converted to a visit. Discussion came along.");
      onClose();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 space-y-3 rounded-lg border border-dust bg-cream/60 p-4"
    >
      <p className="text-xs uppercase tracking-wide text-ink/50">
        Convert to visit
      </p>
      <p className="text-xs text-ink/60">
        Replaces the suggestion with a visit anchored to this stop. Comments and
        votes move across.
      </p>

      <div className="space-y-1">
        <Label htmlFor={`conv-kind-${suggestionId}`} className="text-xs">
          Kind
        </Label>
        <select
          id={`conv-kind-${suggestionId}`}
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          disabled={isPending}
          className="h-9 w-full rounded border border-dust bg-white px-2 text-sm text-ink outline-none focus:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
        >
          <option value="daytrip">Daytrip (round-trip from this stop)</option>
          <option value="enroute">Enroute (on the drive to the next stop)</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`conv-name-${suggestionId}`} className="text-xs">
          Name
        </Label>
        <Input
          id={`conv-name-${suggestionId}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`conv-lat-${suggestionId}`} className="text-xs">
            Latitude
          </Label>
          <Input
            id={`conv-lat-${suggestionId}`}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            disabled={isPending}
            placeholder="40.1489"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`conv-lng-${suggestionId}`} className="text-xs">
            Longitude
          </Label>
          <Input
            id={`conv-lng-${suggestionId}`}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            disabled={isPending}
            placeholder="18.1513"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`conv-date-${suggestionId}`} className="text-xs">
            Date <span className="text-ink/60">(optional)</span>
          </Label>
          <Input
            id={`conv-date-${suggestionId}`}
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`conv-desc-${suggestionId}`} className="text-xs">
          Description <span className="text-ink/60">(optional)</span>
        </Label>
        <textarea
          id={`conv-desc-${suggestionId}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={2}
          className="w-full resize-y rounded border border-dust bg-white px-3 py-2 text-base text-ink outline-none placeholder:text-ink/40 focus:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
        />
      </div>

      {error && <p className="text-sm text-wine">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isPending}
          className="text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || name.trim().length === 0}
          className="bg-terracotta text-cream hover:bg-terracotta/90"
        >
          {isPending ? "Converting…" : "Convert"}
        </Button>
      </div>
    </form>
  );
}
