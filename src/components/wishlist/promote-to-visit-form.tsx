"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { promoteWishlistToVisit } from "@/lib/actions/wishlist";
import type { PromotionItinerary } from "@/lib/queries/wishlist";

type Kind = "daytrip" | "enroute";

export function PromoteToVisitForm({
  wishlistId,
  defaultName,
  defaultDescription,
  defaultLat,
  defaultLng,
  targets,
  onClose,
}: {
  wishlistId: number;
  defaultName: string;
  defaultDescription: string | null;
  defaultLat: string | null;
  defaultLng: string | null;
  targets: PromotionItinerary[];
  onClose: () => void;
}) {
  const [itineraryId, setItineraryId] = useState<number | "">(
    targets[0]?.id ?? "",
  );
  const [kind, setKind] = useState<Kind>("daytrip");
  const [stopId, setStopId] = useState<number | "">("");
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [lat, setLat] = useState(defaultLat ?? "");
  const [lng, setLng] = useState(defaultLng ?? "");
  const [visitDate, setVisitDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const currentItinerary = useMemo(
    () => targets.find((t) => t.id === itineraryId),
    [targets, itineraryId],
  );

  // Enroute visits can't anchor on the final stop.
  const anchorStops = useMemo(() => {
    const all = currentItinerary?.stops ?? [];
    return kind === "enroute" ? all.filter((s) => !s.isLast) : all;
  }, [currentItinerary, kind]);

  // Keep stopId coherent when itinerary/kind changes: default to first allowed.
  const effectiveStopId: number | "" =
    stopId !== "" && anchorStops.some((s) => s.id === stopId)
      ? stopId
      : (anchorStops[0]?.id ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (effectiveStopId === "") {
      setError("Pick an anchor stop.");
      return;
    }
    startTransition(async () => {
      const result = await promoteWishlistToVisit({
        wishlistId,
        stopId: Number(effectiveStopId),
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
      toast.success("Added as a visit.");
      onClose();
      router.refresh();
    });
  }

  if (targets.length === 0 || (currentItinerary?.stops.length ?? 0) === 0) {
    return (
      <div className="rounded-lg border border-dust bg-white p-4 text-sm text-ink/70">
        <p>Need at least one itinerary with a stop to anchor a visit.</p>
        <div className="mt-2 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose} className="text-sm">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-dust bg-white p-4"
    >
      <p className="text-xs uppercase tracking-wide text-ink/50">
        Promote to visit
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`visit-kind-${wishlistId}`} className="text-xs">Kind</Label>
          <select
            id={`visit-kind-${wishlistId}`}
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            disabled={isPending}
            className="h-9 w-full rounded border border-dust bg-white px-2 text-sm text-ink focus:border-ink/40 outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
          >
            <option value="daytrip">Daytrip (round-trip)</option>
            <option value="enroute">Enroute (on the drive)</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`visit-it-${wishlistId}`} className="text-xs">Itinerary</Label>
          <select
            id={`visit-it-${wishlistId}`}
            value={itineraryId}
            onChange={(e) => setItineraryId(e.target.value ? Number(e.target.value) : "")}
            disabled={isPending}
            className="h-9 w-full rounded border border-dust bg-white px-2 text-sm text-ink focus:border-ink/40 outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`visit-stop-${wishlistId}`} className="text-xs">
          {kind === "daytrip" ? "Based at" : "Leaving from"}
        </Label>
        <select
          id={`visit-stop-${wishlistId}`}
          value={effectiveStopId}
          onChange={(e) => setStopId(e.target.value ? Number(e.target.value) : "")}
          disabled={isPending || anchorStops.length === 0}
          className="h-9 w-full rounded border border-dust bg-white px-2 text-sm text-ink focus:border-ink/40 outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
        >
          {anchorStops.length === 0 ? (
            <option value="">No eligible stops</option>
          ) : (
            anchorStops.map((s) => (
              <option key={s.id} value={s.id}>
                Day {s.day}.{s.orderInDay} — {s.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`visit-name-${wishlistId}`} className="text-xs">Name</Label>
        <Input
          id={`visit-name-${wishlistId}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`visit-lat-${wishlistId}`} className="text-xs">Latitude</Label>
          <Input
            id={`visit-lat-${wishlistId}`}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            disabled={isPending}
            placeholder="41.9028"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`visit-lng-${wishlistId}`} className="text-xs">Longitude</Label>
          <Input
            id={`visit-lng-${wishlistId}`}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            disabled={isPending}
            placeholder="12.4964"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`visit-date-${wishlistId}`} className="text-xs">
            Date <span className="text-ink/60">(optional)</span>
          </Label>
          <Input
            id={`visit-date-${wishlistId}`}
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`visit-desc-${wishlistId}`} className="text-xs">
          Description <span className="text-ink/60">(optional)</span>
        </Label>
        <textarea
          id={`visit-desc-${wishlistId}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={2}
          className="w-full resize-y rounded border border-dust bg-white px-3 py-2 text-base text-ink outline-none placeholder:text-ink/40 focus:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-1"
        />
      </div>

      {error && <p className="text-sm text-wine">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} className="text-sm">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || name.trim().length === 0 || anchorStops.length === 0}
          className="bg-terracotta text-cream hover:bg-terracotta/90"
        >
          {isPending ? "Adding…" : "Add as visit"}
        </Button>
      </div>
    </form>
  );
}
