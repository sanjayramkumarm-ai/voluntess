"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-2xl border border-gray-200 text-gray-500">
      Loading map...
    </div>
  ),
});

const BASE_CATEGORIES = [
  "Environment",
  "Education",
  "Health",
  "Community",
  "Animals",
  "Social Welfare",
];

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
};

function LocationIcon() {
  return (
    <svg className="mr-1 inline h-4 w-4 text-gray-500" {...iconProps}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="mr-1 inline h-4 w-4 text-gray-500" {...iconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="mr-1 inline h-4 w-4 text-gray-500" {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5" {...iconProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export default function ExplorePage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [sort, setSort] = useState("default");
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCategory(params.get("category") || "");

    api("/opportunities")
      .then((data) => setOpportunities(data.items || []))
      .catch((err) => setError(err.message || "Unable to load opportunities"))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const fromData = opportunities.map((o) => o.category).filter(Boolean);
    return Array.from(new Set([...BASE_CATEGORIES, ...fromData]));
  }, [opportunities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const loc = city.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list = opportunities.filter((item) => {
      if (category && item.category !== category) return false;

      if (q) {
        const text = `${item.title || ""} ${item.description || ""} ${
          item.location || ""
        }`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (loc && !String(item.location || "").toLowerCase().includes(loc)) {
        return false;
      }

      if (upcomingOnly && item.date && new Date(item.date) < today) {
        return false;
      }

      return true;
    });

    if (sort === "soonest") {
      list.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Infinity;
        const db = b.date ? new Date(b.date).getTime() : Infinity;
        return da - db;
      });
    }

    return list;
  }, [opportunities, search, category, city, upcomingOnly, sort]);

  const hasFilters = Boolean(search || category || city || upcomingOnly);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setCity("");
    setUpcomingOnly(false);
    setSort("default");
  };

  const title = category ? `${category} Opportunities` : "Explore Volunteer Opportunities";
  const description = category
    ? `Find meaningful ${category.toLowerCase()} opportunities and make an impact.`
    : "Find meaningful opportunities, connect with NGOs, and make a difference in your community.";

  const fieldClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-14 text-white">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="mb-5 inline-block text-sm font-medium text-blue-100 hover:text-white"
          >
            &larr; Back to Home
          </Link>

          <p className="mb-3 text-sm font-semibold uppercase tracking-wider">
            {category || "Make an impact"}
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-blue-100">{description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-8">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative md:col-span-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>
              <input
                className={`${fieldClass} pl-12`}
                placeholder="Search by title, description or place"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className={fieldClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              className={fieldClass}
              placeholder="City or location"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={upcomingOnly}
                  onChange={(e) => setUpcomingOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Upcoming only
              </label>

              <select
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="default">Sort: Default</option>
                <option value="soonest">Sort: Soonest date</option>
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {loading && (
          <div className="rounded-xl bg-white p-8 text-center shadow">
            Loading opportunities...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              {hasFilters ? "No matching opportunities" : "No opportunities yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-gray-500">
              {hasFilters
                ? "Try a different search or clear your filters."
                : "New volunteering opportunities will appear here when NGOs publish them."}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div>
            <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${
                  view === "list" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${
                  view === "map" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Map
              </button>
            </div>

            <p className="mb-6 text-sm text-gray-500">
              {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} found
            </p>

            {view === "map" && (
              <div className="mb-6">
                {(() => {
                  const pinned = filtered.filter(
                    (o) => typeof o.latitude === "number" && typeof o.longitude === "number"
                  );
                  return (
                    <>
                      {pinned.length < filtered.length && (
                        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                          {filtered.length - pinned.length} of these have no map pin yet. Switch to List to see them all.
                        </p>
                      )}
                      <MapView items={pinned} />
                    </>
                  );
                })()}
              </div>
            )}

            <div className={view === "map" ? "hidden" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"}>
              {filtered.map((item) => (
                <article
                  key={item._id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="h-2 bg-blue-600" />

                  <div className="p-6">
                    <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {item.category}
                    </span>

                    <h2 className="mt-4 text-xl font-bold text-gray-900">{item.title}</h2>

                    <p className="mt-3 line-clamp-3 text-sm text-gray-600">
                      {item.description}
                    </p>

                    <div className="mt-5 space-y-2 text-sm text-gray-600">
                      <p className="flex items-center">
                        <LocationIcon />
                        {item.location}
                      </p>

                      <p className="flex items-center">
                        <CalendarIcon />
                        {item.date
                          ? new Date(item.date).toLocaleDateString()
                          : "Date not specified"}
                      </p>

                      {item.startTime && (
                        <p className="flex items-center">
                          <ClockIcon />
                          {item.startTime}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/opportunities/${item._id}`}
                      className="mt-6 block rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700"
                    >
                      View Opportunity
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
