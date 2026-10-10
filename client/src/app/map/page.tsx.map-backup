"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MapItem } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-2xl border border-gray-200 text-gray-500">
      Loading map...
    </div>
  ),
});

export default function MapPage() {
  const [items, setItems] = useState<MapItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/opportunities")
      .then((data: any) => {
        const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.opportunities) ? data.opportunities : [];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const upcoming = list.filter((o) => !o.date || new Date(o.date) >= startOfToday);
        setTotal(upcoming.length);
        setItems(
          upcoming.filter(
            (o) => typeof o.latitude === "number" && typeof o.longitude === "number"
          ) as MapItem[]
        );
      })
      .catch((err: any) => setError(err.message || "Could not load opportunities"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Opportunities near you</h1>
          <p className="mt-1 text-gray-600">Tap a pin to see the details.</p>
        </div>
        <Link href="/explore" className="text-sm font-semibold text-blue-600 hover:underline">
          Switch to list view
        </Link>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && total > items.length && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
          {total - items.length} upcoming {total - items.length === 1 ? "opportunity has" : "opportunities have"} no
          map pin yet, so {total - items.length === 1 ? "it isn't" : "they aren't"} shown here. They are still in the list view.
        </p>
      )}

      <MapView items={items} />
    </main>
  );
}