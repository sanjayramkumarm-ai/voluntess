"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapItem = {
  _id: string;
  title: string;
  location?: string;
  category?: string;
  date?: string;
  latitude: number;
  longitude: number;
};

const CHENNAI: [number, number] = [13.0827, 80.2707];

function pinIcon() {
  return L.divIcon({
    className: "",
    html: '<span style="display:block;width:22px;height:22px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function popupFor(item: MapItem) {
  const box = document.createElement("div");
  box.style.minWidth = "160px";

  const title = document.createElement("strong");
  title.textContent = item.title;
  title.style.display = "block";
  box.appendChild(title);

  const meta = [
    item.date
      ? new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "",
    item.location || "",
  ]
    .filter(Boolean)
    .join(" - ");

  if (meta) {
    const line = document.createElement("div");
    line.textContent = meta;
    line.style.margin = "4px 0 8px";
    line.style.color = "#475569";
    box.appendChild(line);
  }

  const link = document.createElement("a");
  link.href = "/opportunities/" + item._id;
  link.textContent = "View details";
  link.style.color = "#2563eb";
  link.style.fontWeight = "600";
  box.appendChild(link);

  return box;
}

export default function MapView({ items }: { items: MapItem[] }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || mapRef.current) return;

    const map = L.map(el.current).setView(CHENNAI, 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (items.length === 0) return;

    items.forEach((item) => {
      L.marker([item.latitude, item.longitude], { icon: pinIcon() })
        .bindPopup(popupFor(item))
        .addTo(layer);
    });

    if (items.length === 1) {
      map.setView([items[0].latitude, items[0].longitude], 14);
    } else {
      map.fitBounds(
        L.latLngBounds(items.map((i) => [i.latitude, i.longitude] as [number, number])),
        { padding: [40, 40], maxZoom: 15 }
      );
    }
  }, [items]);

  return <div ref={el} className="h-[70vh] w-full rounded-2xl border border-gray-200" />;
}