"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CHENNAI: [number, number] = [13.0827, 80.2707];
const round = (n: number) => Math.round(n * 100000) / 100000;

function pinIcon() {
  return L.divIcon({
    className: "",
    html: '<span style="display:block;width:22px;height:22px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const has = typeof latitude === "number" && typeof longitude === "number";

  useEffect(() => {
    if (!el.current || mapRef.current) return;

    const map = L.map(el.current).setView(has ? [latitude as number, longitude as number] : CHENNAI, has ? 14 : 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onChangeRef.current(round(e.latlng.lat), round(e.latlng.lng));
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!has) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const pos: [number, number] = [latitude as number, longitude as number];

    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      const marker = L.marker(pos, { draggable: true, icon: pinIcon() }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChangeRef.current(round(p.lat), round(p.lng));
      });
      markerRef.current = marker;
    }
  }, [has, latitude, longitude]);

  return (
    <div>
      <div ref={el} className="h-72 w-full rounded-xl border border-gray-300" />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500">
        <span>
          {has
            ? `Pin set (${latitude}, ${longitude}). Drag it or tap elsewhere to move it.`
            : "Tap the map to drop a pin where volunteers should go."}
        </span>
        {has && (
          <button
            type="button"
            onClick={() => onChangeRef.current(null, null)}
            className="font-semibold text-red-600"
          >
            Remove pin
          </button>
        )}
      </div>
    </div>
  );
}