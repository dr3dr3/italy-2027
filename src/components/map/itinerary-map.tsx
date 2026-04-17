"use client";

import { useEffect } from "react";
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
  onPinClick,
}: {
  stops: MapStop[];
  onPinClick?: (stopId: number) => void;
}) {
  const ordered = [...stops].sort(
    (a, b) => a.day - b.day || a.orderInDay - b.orderInDay,
  );
  const line: [number, number][] = ordered.map((s) => [s.lat, s.lng]);

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
      </MapContainer>
    </div>
  );
}
