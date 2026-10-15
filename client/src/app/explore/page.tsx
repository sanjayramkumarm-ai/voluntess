"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
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

function Svg({ children, className = "h-4 w-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  pin: <Svg><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Svg>,
  clock: <Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  users: <Svg><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></Svg>,
  search: <Svg><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>,
  list: <Svg><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>,
  map: <Svg><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" /></Svg>,
  arrow: <Svg><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
};

function dateParts(value?: string) {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) return { day: "–", month: "TBD", past: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString("en-IN", { month: "short" }),
    past: d.getTime() < today.getTime(),
  };
}

function formatDate(value?: string) {
  if (!value) return "Date not specified";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Date not specified";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function clock(v?: string) {
  const m = String(v || "").match(/(\d{1,2}):(\d{2})/);
  return m ? { h: Number(m[1]), min: Number(m[2]) } : null;
}

// An opportunity is past once its end time (or the end of its day) has gone by
function isPastItem(o: any) {
  if (!o?.date) return false;
  const d = new Date(o.date);
  if (isNaN(d.getTime())) return false;
  const end = clock(o.endTime);
  const endAt = end
    ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), end.h, end.min)
    : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return endAt.getTime() < Date.now();
}

export default function ExplorePage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [when, setWhen] = useState<"upcoming" | "all" | "past">("upcoming");
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

      if (when === "upcoming" ? isPastItem(item) : when === "past" ? !isPastItem(item) : false) {
        return false;
      }

      return true;
    });

    if (sort === "default") {
      const key = (o: any) => (o.date ? new Date(o.date).getTime() : Infinity);
      list.sort((a, b) => {
        const pa = isPastItem(a);
        const pb = isPastItem(b);
        if (pa !== pb) return pa ? 1 : -1;
        const ka = key(a);
        const kb = key(b);
        if (ka === kb) return 0;
        return pa ? kb - ka : ka - kb;
      });
    } else if (sort === "soonest") {
      list.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Infinity;
        const db = b.date ? new Date(b.date).getTime() : Infinity;
        return da - db;
      });
    } else if (sort === "latest") {
      list.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : -Infinity;
        const db = b.date ? new Date(b.date).getTime() : -Infinity;
        return db - da;
      });
    }

    return list;
  }, [opportunities, search, category, city, when, sort]);

  const hasFilters = Boolean(search || category || city);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setCity("");
    setWhen("upcoming");
    setSort("default");
  };

  const title = category ? `${category} opportunities` : "Explore opportunities";
  const description = category
    ? `Find meaningful ${category.toLowerCase()} opportunities and make an impact.`
    : "Find volunteering opportunities, connect with NGOs and make a difference in your community.";

  const upcomingList = filtered.filter((o) => !isPastItem(o));
  const pastList = filtered.filter((o) => isPastItem(o));
  const pastTotal = opportunities.filter((o) => isPastItem(o)).length;
  const pinned = upcomingList.filter(
    (o) => typeof o.latitude === "number" && typeof o.longitude === "number"
  );

  const chips: { label: string; clear: () => void }[] = [];
  if (search) chips.push({ label: `Search: ${search}`, clear: () => setSearch("") });
  if (category) chips.push({ label: category, clear: () => setCategory("") });
  if (city) chips.push({ label: `Location: ${city}`, clear: () => setCity("") });
  if (when !== "upcoming") chips.push({ label: when === "all" ? "Including past" : "Past only", clear: () => setWhen("upcoming") });

  const field =
    "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const renderCard = (item: any) => {
    const p = dateParts(item.date);
    const past = isPastItem(item);
    return (
      <article
        key={item._id}
        className={`group flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md ${past ? "opacity-80" : ""}`}
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md ${past ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-700"}`}>
            <span className="text-lg font-bold leading-none tabular-nums">{p.day}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{p.month}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {item.category && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                  {item.category}
                </span>
              )}
              {item.date && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${past ? "text-gray-400" : "text-emerald-600"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${past ? "bg-gray-300" : "bg-emerald-500"}`} />
                  {past ? "Ended" : "Upcoming"}
                </span>
              )}
            </div>
            <h2 className="mt-1.5 break-words text-base font-semibold leading-snug text-gray-900">
              {item.title}
            </h2>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-600">
          {item.description}
        </p>

        <ul className="mb-4 mt-4 space-y-1.5 text-sm text-gray-600">
          {item.location && (
            <li className="flex items-center gap-2">
              <span className="text-gray-400">{icons.pin}</span>
              <span className="min-w-0 truncate">{item.location}</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <span className="text-gray-400">{icons.clock}</span>
            <span className="tabular-nums">
              {formatDate(item.date)}
              {item.startTime ? ` · ${item.startTime}` : ""}
              {item.startTime && item.endTime ? ` - ${item.endTime}` : ""}
            </span>
          </li>
          {item.capacity ? (
            <li className="flex items-center gap-2">
              <span className="text-gray-400">{icons.users}</span>
              <span>{item.capacity} volunteers needed</span>
            </li>
          ) : null}
        </ul>

        <div className="mt-auto border-t border-gray-100 pt-4">
          <Link
            href={`/opportunities/${item._id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            View details
            <span className="transition group-hover:translate-x-0.5">{icons.arrow}</span>
          </Link>
        </div>
      </article>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-gray-500">
              <Link href="/" className="hover:text-gray-800">Home</Link>
              <span className="mx-1 text-gray-300">/</span>
              Explore
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>
          </div>
          <p className="text-sm text-gray-500" aria-live="polite">
            {loading ? "Loading…" : (
              <>
                <span className="font-semibold tabular-nums text-gray-900">{filtered.length}</span>{" "}
                {when === "upcoming" ? "upcoming " : when === "past" ? "past " : ""}{filtered.length === 1 ? "opportunity" : "opportunities"}
                {when === "upcoming" && pastTotal > 0 ? <span> · {pastTotal} past</span> : null}
              </>
            )}
          </p>
        </div>

        {/* Filter bar */}
        <section aria-label="Filters" className="mt-5 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icons.search}</span>
              <input
                type="search"
                className={`${field} w-full pl-9`}
                placeholder="Search title, description or place"
                aria-label="Search opportunities"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <select className={field} aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <input
              className={field}
              placeholder="City or location"
              aria-label="City or location"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />

            <select className={field} aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">Sort: Default</option>
              <option value="soonest">Sort: Soonest first</option>
              <option value="latest">Sort: Latest first</option>
            </select>

            <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
              <div className="inline-flex rounded-md border border-gray-300 bg-gray-50 p-0.5" role="group" aria-label="When">
                {([["upcoming", "Upcoming"], ["all", "All"], ["past", "Past"]] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setWhen(v)}
                    aria-pressed={when === v}
                    className={`rounded px-2.5 py-1.5 text-sm font-medium ${when === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-md border border-gray-300 bg-gray-50 p-0.5" role="group" aria-label="View">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  aria-pressed={view === "list"}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium ${view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                >
                  {icons.list} List
                </button>
                <button
                  type="button"
                  onClick={() => setView("map")}
                  aria-pressed={view === "map"}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium ${view === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                >
                  {icons.map} Map
                </button>
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              {chips.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-medium text-blue-700">
                  {c.label}
                  <button
                    type="button"
                    onClick={c.clear}
                    aria-label={`Remove filter ${c.label}`}
                    className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-100"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <button onClick={clearFilters} className="ml-1 text-xs font-semibold text-gray-500 hover:text-gray-900">
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* Results */}
        <section className="mt-5">
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-5">
                  <div className="flex gap-4">
                    <div className="h-14 w-14 rounded-md bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-gray-100" />
                      <div className="h-4 w-2/3 rounded bg-gray-200" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="h-3 rounded bg-gray-100" />
                    <div className="h-3 w-5/6 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white px-6 py-14 text-center">
              <p className="text-sm font-semibold text-gray-800">
                {hasFilters ? "No matching opportunities" : when === "upcoming" && pastTotal > 0 ? "No upcoming opportunities right now" : "No opportunities yet"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                {hasFilters
                  ? "Try a different search or clear your filters."
                  : "New volunteering opportunities will appear here when NGOs publish them."}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <>
              {view === "map" && (
                <div className="mb-4">
                  {pinned.length < upcomingList.length && (
                    <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                      {upcomingList.length - pinned.length} of these have no map pin yet. Switch to List to see them all.
                    </p>
                  )}
                  <MapView items={pinned} />
                </div>
              )}

              <div className={view === "map" ? "hidden" : "space-y-10"}>
                {upcomingList.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingList.map((item) => renderCard(item))}
                  </div>
                )}

                {pastList.length > 0 && (
                  <div>
                    {when === "all" && (
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                        Past opportunities ({pastList.length})
                      </h2>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {pastList.map((item) => renderCard(item))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}