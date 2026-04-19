"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import type { MapStop, MapVisit } from "./itinerary-map";
import { MapSkeleton } from "./map-skeleton";

const ItineraryMap = dynamic(() => import("./itinerary-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function ItineraryMapLoader({
  stops,
  visits = [],
}: {
  stops: MapStop[];
  visits?: MapVisit[];
}) {
  const handlePinClick = useCallback((stopId: number) => {
    const el = document.getElementById(`stop-${stopId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("highlight-flash");
    window.setTimeout(() => el.classList.remove("highlight-flash"), 1500);
  }, []);

  return (
    <ItineraryMap stops={stops} visits={visits} onPinClick={handlePinClick} />
  );
}
