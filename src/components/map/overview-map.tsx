"use client";

import { Fragment, useEffect, useMemo } from "react";
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
  label: string;
  dashArray: string | undefined;
  stops: OverviewStop[];
};

function labeledIcon(colour: string, label: string) {
  return L.divIcon({
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${colour};border:1.5px solid #faf7f2;color:#faf7f2;font:600 11px/1 Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(0,0,0,0.35);">${label}</div>`,
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
  const icons = useMemo(
    () => new Map(itineraries.map((it) => [it.id, labeledIcon(it.colour, it.label)])),
    [itineraries],
  );

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
          const icon = icons.get(it.id)!;
          return (
            <Fragment key={it.id}>
              {line.length > 1 && (
                <Polyline
                  positions={line}
                  pathOptions={{
                    color: it.colour,
                    weight: 2.5,
                    opacity: 0.75,
                    dashArray: it.dashArray,
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
                      href={`/itineraries/${it.slug}#stop-${s.id}`}
                      className="mt-2 inline-block text-sm text-terracotta hover:underline"
                    >
                      Open stop →
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
