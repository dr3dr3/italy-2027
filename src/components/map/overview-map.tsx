"use client";

import { Fragment, useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "./leaflet-setup";

export type OverviewStop = {
  id: number;
  name: string;
  day: number;
  orderInDay: number;
  lat: number;
  lng: number;
};

export type OverviewItinerary = {
  id: number;
  slug: string;
  title: string;
  colour: string;
  stops: OverviewStop[];
};

function coloredIcon(colour: string) {
  return L.divIcon({
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="${colour}" stroke="white" stroke-width="1.5"/></svg>`,
  });
}

function FitBounds({ itineraries }: { itineraries: OverviewItinerary[] }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = itineraries.flatMap((it) =>
      it.stops.map((s) => [s.lat, s.lng] as [number, number]),
    );
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, itineraries]);
  return null;
}

export default function OverviewMap({
  itineraries,
}: {
  itineraries: OverviewItinerary[];
}) {
  const firstStop = itineraries.find((it) => it.stops.length > 0)?.stops[0];
  const center: [number, number] = firstStop
    ? [firstStop.lat, firstStop.lng]
    : [42, 12];

  return (
    <div className="h-60 md:h-80 w-full rounded-lg border border-dust overflow-hidden">
      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds itineraries={itineraries} />
        {itineraries.map((it) => {
          const ordered = [...it.stops].sort(
            (a, b) => a.day - b.day || a.orderInDay - b.orderInDay,
          );
          const line: [number, number][] = ordered.map((s) => [s.lat, s.lng]);
          const icon = coloredIcon(it.colour);
          return (
            <Fragment key={it.id}>
              {line.length > 1 && (
                <Polyline
                  positions={line}
                  pathOptions={{
                    color: it.colour,
                    weight: 2,
                    opacity: 0.7,
                    dashArray: "6 8",
                  }}
                />
              )}
              {ordered.map((s) => (
                <Marker key={s.id} position={[s.lat, s.lng]} icon={icon}>
                  <Popup>
                    <div className="font-serif text-base font-semibold text-ink">
                      {s.name}
                    </div>
                    <div className="text-xs text-ink/60 mt-0.5">
                      {it.title}
                    </div>
                    <Link
                      href={`/itineraries/${it.slug}`}
                      className="mt-2 inline-block text-sm text-terracotta hover:underline"
                    >
                      View itinerary →
                    </Link>
                  </Popup>
                </Marker>
              ))}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
