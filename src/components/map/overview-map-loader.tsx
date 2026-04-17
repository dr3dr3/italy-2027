"use client";

import dynamic from "next/dynamic";
import type { OverviewItinerary } from "./overview-map";

function OverviewMapSkeleton() {
  return (
    <div className="h-60 md:h-80 w-full rounded-lg border border-dust bg-cream flex items-center justify-center">
      <span className="text-sm text-ink/40">Loading map…</span>
    </div>
  );
}

const OverviewMap = dynamic(() => import("./overview-map"), {
  ssr: false,
  loading: () => <OverviewMapSkeleton />,
});

export function OverviewMapLoader({
  itineraries,
}: {
  itineraries: OverviewItinerary[];
}) {
  return <OverviewMap itineraries={itineraries} />;
}
