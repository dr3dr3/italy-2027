"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { promoteWishlistToStop } from "@/lib/actions/wishlist";
import type { PromotionItinerary } from "@/lib/queries/wishlist";

export function PromoteToStopForm({
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
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [lat, setLat] = useState(defaultLat ?? "");
  const [lng, setLng] = useState(defaultLng ?? "");
  const [day, setDay] = useState("1");
  const [orderInDay, setOrderInDay] = useState("1");
  const [arriveDate, setArriveDate] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (itineraryId === "") {
      setError("Pick an itinerary.");
      return;
    }
    startTransition(async () => {
      const result = await promoteWishlistToStop({
        wishlistId,
        itineraryId: Number(itineraryId),
        name,
        description: description || undefined,
        lat,
        lng,
        day: Number(day),
        orderInDay: Number(orderInDay),
        arriveDate,
        departDate,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Added as a stop.");
      onClose();
      router.refresh();
    });
  }

  if (targets.length === 0) {
    return (
      <div className="rounded-lg border border-dust bg-white p-4 text-sm text-ink/70">
        <p>No draft or active itineraries to promote into.</p>
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
        Promote to stop
      </p>
      <div className="space-y-1">
        <Label htmlFor={`stop-it-${wishlistId}`} className="text-xs">
          Itinerary
        </Label>
        <select
          id={`stop-it-${wishlistId}`}
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`stop-name-${wishlistId}`} className="text-xs">Name</Label>
          <Input
            id={`stop-name-${wishlistId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`stop-day-${wishlistId}`} className="text-xs">Day</Label>
            <Input
              id={`stop-day-${wishlistId}`}
              type="number"
              min="1"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`stop-order-${wishlistId}`} className="text-xs">Order</Label>
            <Input
              id={`stop-order-${wishlistId}`}
              type="number"
              min="1"
              value={orderInDay}
              onChange={(e) => setOrderInDay(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`stop-lat-${wishlistId}`} className="text-xs">Latitude</Label>
          <Input
            id={`stop-lat-${wishlistId}`}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            disabled={isPending}
            placeholder="41.9028"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`stop-lng-${wishlistId}`} className="text-xs">Longitude</Label>
          <Input
            id={`stop-lng-${wishlistId}`}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            disabled={isPending}
            placeholder="12.4964"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`stop-arrive-${wishlistId}`} className="text-xs">Arrive</Label>
          <Input
            id={`stop-arrive-${wishlistId}`}
            type="date"
            value={arriveDate}
            onChange={(e) => setArriveDate(e.target.value)}
            disabled={isPending}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`stop-depart-${wishlistId}`} className="text-xs">Depart</Label>
          <Input
            id={`stop-depart-${wishlistId}`}
            type="date"
            value={departDate}
            onChange={(e) => setDepartDate(e.target.value)}
            disabled={isPending}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`stop-desc-${wishlistId}`} className="text-xs">
          Description <span className="text-ink/60">(optional)</span>
        </Label>
        <textarea
          id={`stop-desc-${wishlistId}`}
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
          disabled={isPending || name.trim().length === 0}
          className="bg-terracotta text-cream hover:bg-terracotta/90"
        >
          {isPending ? "Adding…" : "Add as stop"}
        </Button>
      </div>
    </form>
  );
}
