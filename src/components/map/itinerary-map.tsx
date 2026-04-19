"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_COLOURS } from "./leaflet-setup";
import { formatRange, formatDay } from "@/lib/dates";

export type MapStop = {
  id: number;
  name: string;
  day: number;
  orderInDay: number;
  lat: number;
  lng: number;
  arriveDate: string | null;
  departDate: string | null;
};

export type MapVisit = {
  id: number;
  name: string;
  kind: "daytrip" | "enroute";
  lat: number;
  lng: number;
  visitDate: string | null;
};

// Visits only render once the viewport is roughly sub-regional. At lower
// zoom they pile on top of the stop markers and crowd the map.
const VISIT_MIN_ZOOM = 9;

const VISIT_ICON = L.divIcon({
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${MAP_COLOURS.dust};border:2px solid ${MAP_COLOURS.olive};box-shadow:0 1px 2px rgba(0,0,0,0.2);"></div>`,
});

function VisitMarkers({ visits }: { visits: MapVisit[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(map.getZoom());
  useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on("zoomend", handler);
    return () => {
      map.off("zoomend", handler);
    };
  }, [map]);

  if (zoom < VISIT_MIN_ZOOM) return null;
  return (
    <>
      {visits.map((v) => (
        <Marker key={v.id} position={[v.lat, v.lng]} icon={VISIT_ICON}>
          <Popup>
            <div className="font-serif text-base font-semibold text-ink">
              {v.name}
            </div>
            <div className="text-xs text-ink/60 mt-0.5">
              {v.kind === "daytrip" ? "Day trip" : "Enroute"}
              {v.visitDate && ` · ${formatDay(v.visitDate)}`}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function FitBounds({ stops }: { stops: MapStop[] }) {
  const map = useMap();
  useEffect(() => {
    if (stops.length === 0) return;
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, stops]);
  return null;
}

export default function ItineraryMap({
  stops,
  visits = [],
  onPinClick,
}: {
  stops: MapStop[];
  visits?: MapVisit[];
  onPinClick?: (stopId: number) => void;
}) {
  const ordered = useMemo(
    () => [...stops].sort((a, b) => a.day - b.day || a.orderInDay - b.orderInDay),
    [stops],
  );
  const line = useMemo<[number, number][]>(
    () => ordered.map((s) => [s.lat, s.lng]),
    [ordered],
  );

  const center: [number, number] =
    ordered.length > 0 ? [ordered[0].lat, ordered[0].lng] : [42, 12];

  return (
    <div className="h-75 md:h-100 w-full rounded-lg border border-dust overflow-hidden">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds stops={ordered} />
        {line.length > 1 && (
          <Polyline
            positions={line}
            pathOptions={{
              color: MAP_COLOURS.terracotta,
              weight: 2,
              opacity: 0.7,
              dashArray: "6 8",
            }}
          />
        )}
        {ordered.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]}>
            <Popup>
              <div className="font-serif text-base font-semibold text-ink">
                {s.name}
              </div>
              {s.arriveDate && s.departDate && (
                <div className="text-xs text-ink/60 mt-0.5">
                  {formatRange(s.arriveDate, s.departDate)}
                </div>
              )}
              {s.arriveDate && !s.departDate && (
                <div className="text-xs text-ink/60 mt-0.5">
                  {formatDay(s.arriveDate)}
                </div>
              )}
              {onPinClick && (
                <button
                  type="button"
                  onClick={() => onPinClick(s.id)}
                  className="mt-2 text-sm text-terracotta hover:underline"
                >
                  Jump to details ↓
                </button>
              )}
            </Popup>
          </Marker>
        ))}
        <VisitMarkers visits={visits} />
      </MapContainer>
    </div>
  );
}
