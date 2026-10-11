"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, getUser, logout } from "@/lib/api";

const PAGE_SIZE = 8;

function formatDate(value?: string) {
  if (!value) return "No date";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}

function timeOf(value?: string) {
  if (!value) return NaN;
  return new Date(value).getTime();
}

function isUpcoming(value?: string) {
  const t = timeOf(value);
  return !isNaN(t) && t >= startOfToday();
}

function Svg({ children, className = "h-4 w-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  grid: <Svg><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Svg>,
  list: <Svg><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>,
  building: <Svg><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></Svg>,
  calendar: <Svg className="h-5 w-5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>,
  clock: <Svg className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  users: <Svg className="h-5 w-5"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></Svg>,
  org: <Svg className="h-5 w-5"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></Svg>,
  trash: <Svg><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></Svg>,
  download: <Svg><path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" /></Svg>,
  refresh: <Svg><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></Svg>,
  search: <Svg><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>,
  logout: <Svg><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Svg>,
};

type SortKey = "title" | "date" | "capacity";

export default function AdminDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toasts, setToasts] = useState<{ id: number; text: string; type: "success" | "error" }[]>([]);

  const [tab, setTab] = useState<"all" | "upcoming" | "past">("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const [pendingDelete, setPendingDelete] = useState<any[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  function toast(text: string, type: "success" | "error" = "success") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);

    if (currentUser?.role !== "admin") {
      setLoading(false);
      return;
    }

    loadOpportunities();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, query, category, sortKey, sortDir]);

  async function loadOpportunities() {
    try {
      setLoading(true);
      setLoadError("");
      const data = await api("/opportunities");
      setOpportunities(data?.items || []);
      setSelected([]);
    } catch (error: any) {
      setLoadError(error.message || "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || pendingDelete.length === 0) return;
    setDeleting(true);

    const results = await Promise.allSettled(
      pendingDelete.map((o) => api(`/opportunities/${o._id}`, { method: "DELETE" }))
    );

    const removed: string[] = [];
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") removed.push(pendingDelete[i]._id);
      else failed += 1;
    });

    setOpportunities((cur) => cur.filter((o) => !removed.includes(o._id)));
    setSelected((cur) => cur.filter((id) => !removed.includes(id)));

    if (removed.length > 0) {
      toast(removed.length === 1 ? "Opportunity deleted." : `${removed.length} opportunities deleted.`);
    }
    if (failed > 0) toast(`${failed} could not be deleted.`, "error");

    setDeleting(false);
    setPendingDelete(null);
  }

  /* ---------- derived data ---------- */

  const counts = useMemo(() => {
    const upcoming = opportunities.filter((o) => isUpcoming(o.date)).length;
    return { all: opportunities.length, upcoming, past: opportunities.length - upcoming };
  }, [opportunities]);

  const kpis = useMemo(() => {
    const today = startOfToday();
    const week = today + 7 * 86400000;
    const thisWeek = opportunities.filter((o) => {
      const t = timeOf(o.date);
      return !isNaN(t) && t >= today && t < week;
    }).length;
    const capacity = opportunities.reduce((s, o) => s + (Number(o.capacity) || 0), 0);
    const organizers = new Set(opportunities.map((o) => o.organizer?.name).filter(Boolean)).size;
    const avg = opportunities.length ? Math.round(capacity / opportunities.length) : 0;
    return { thisWeek, capacity, organizers, avg };
  }, [opportunities]);

  const categories = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.category).filter(Boolean))).sort() as string[],
    [opportunities]
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    opportunities.forEach((o) => {
      const k = o.category || "Uncategorised";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [opportunities]);

  const byMonth = useMemo(() => {
    const now = new Date();
    const buckets = [-2, -1, 0, 1, 2, 3].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString("en-IN", { month: "short" }), current: offset === 0, count: 0 };
    });
    opportunities.forEach((o) => {
      const t = timeOf(o.date);
      if (isNaN(t)) return;
      const d = new Date(t);
      const b = buckets.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
      if (b) b.count += 1;
    });
    return buckets;
  }, [opportunities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = opportunities.filter((o) => {
      if (tab === "upcoming" && !isUpcoming(o.date)) return false;
      if (tab === "past" && isUpcoming(o.date)) return false;
      if (category !== "all" && o.category !== category) return false;
      if (!q) return true;
      return (
        String(o.title || "").toLowerCase().includes(q) ||
        String(o.location || "").toLowerCase().includes(q) ||
        String(o.organizer?.name || "").toLowerCase().includes(q)
      );
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "title") return dir * String(a.title || "").localeCompare(String(b.title || ""));
      if (sortKey === "capacity") return dir * ((Number(a.capacity) || 0) - (Number(b.capacity) || 0));
      const ta = isNaN(timeOf(a.date)) ? 0 : timeOf(a.date);
      const tb = isNaN(timeOf(b.date)) ? 0 : timeOf(b.date);
      return dir * (ta - tb);
    });
  }, [opportunities, tab, query, category, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageIds = pageItems.map((o) => o._id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "title" ? "asc" : "desc");
    }
  }

  function toggleRow(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function togglePage() {
    setSelected((cur) =>
      allOnPageSelected ? cur.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...cur, ...pageIds]))
    );
  }

  function exportCsv() {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Title", "Category", "Location", "Date", "Capacity", "Created by"];
    const rows = filtered.map((o) =>
      [o.title, o.category, o.location, o.date ? new Date(o.date).toISOString().slice(0, 10) : "", o.capacity, o.organizer?.name].map(esc).join(",")
    );
    const blob = new Blob([[header.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voluntess-opportunities-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} rows to CSV.`);
  }

  /* ---------- access denied ---------- */

  if (!loading && user?.role !== "admin") {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">🔒</div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Admin access required</h1>
          <p className="mt-2 text-sm text-gray-500">Your account does not have permission to view this page.</p>
          <Link href="/dashboard" className="mt-6 inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const maxMonth = Math.max(1, ...byMonth.map((b) => b.count));
  const maxCat = Math.max(1, ...byCategory.map((c) => c[1]));
  const gridCols = "lg:grid-cols-[28px_minmax(0,2.3fr)_1.3fr_1.2fr_80px_1.2fr_84px]";

  const kpiCards = [
    { label: "Total opportunities", value: counts.all, note: `${kpis.thisWeek} in the next 7 days`, icon: icons.calendar, tone: "text-blue-600 bg-blue-50" },
    { label: "Upcoming", value: counts.upcoming, note: `${counts.past} completed or past`, icon: icons.clock, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Volunteer capacity", value: kpis.capacity, note: `Avg ${kpis.avg} per opportunity`, icon: icons.users, tone: "text-indigo-600 bg-indigo-50" },
    { label: "Active organizers", value: kpis.organizers, note: "Creating opportunities", icon: icons.org, tone: "text-amber-600 bg-amber-50" },
  ];

  const sortMark = (k: SortKey) => (sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        {/* Sidebar */}
        <aside className="mb-6 lg:sticky lg:top-24 lg:mb-0 lg:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Administration</p>
            <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin">
              <a href="#overview" className="flex items-center gap-2.5 whitespace-nowrap rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                {icons.grid} Overview
              </a>
              <a href="#opportunities" className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                {icons.list} Opportunities
              </a>
              <Link href="/admin/ngos" className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                {icons.building} NGOs
              </Link>
            </nav>
            <div className="mt-3 hidden border-t border-gray-100 pt-3 lg:block">
              <div className="flex items-center gap-3 px-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {(user?.name || "A").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user?.name || "Admin"}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </div>
              <button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600">
                {icons.logout} Log out
              </button>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          {/* Page header */}
          <div id="overview" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs text-gray-500">Admin <span className="mx-1 text-gray-300">/</span> Overview</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Platform overview</h1>
              <p className="mt-1 text-sm text-gray-500">{today}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCsv} disabled={loading || filtered.length === 0} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {icons.download} Export CSV
              </button>
              <button onClick={loadOpportunities} className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-black">
                {icons.refresh} Refresh
              </button>
            </div>
          </div>

          {loadError && (
            <div role="alert" className="mt-5 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{loadError}</span>
              <button onClick={loadOpportunities} className="font-semibold underline">Retry</button>
            </div>
          )}

          {/* KPIs */}
          <section aria-label="Key metrics" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((k) => (
              <div key={k.label} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-gray-500">{k.label}</p>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-md ${k.tone}`}>{k.icon}</span>
                </div>
                <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{loading ? "–" : k.value}</p>
                <p className="mt-1 text-xs text-gray-500">{loading ? "Loading…" : k.note}</p>
              </div>
            ))}
          </section>

          {/* Charts */}
          <section aria-label="Analytics" className="mt-4 grid gap-4 lg:grid-cols-5">
            <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Opportunities by month</h2>
                <span className="text-xs text-gray-400">Previous 2 and next 3 months</span>
              </div>
              <div className="relative mt-5 h-44">
                <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="border-t border-dashed border-gray-100" />
                  ))}
                </div>
                <div className="relative flex h-full items-end gap-3 sm:gap-6">
                  {byMonth.map((b) => (
                    <div key={`${b.y}-${b.m}`} className="flex h-full flex-1 flex-col items-center justify-end">
                      <span className="mb-1 text-xs font-semibold tabular-nums text-gray-600">{b.count || ""}</span>
                      <div
                        className={`w-full max-w-[44px] rounded-t ${b.current ? "bg-blue-600" : "bg-blue-200"}`}
                        style={{ height: b.count ? `${(b.count / maxMonth) * 82}%` : "2px", opacity: b.count ? 1 : 0.5 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex gap-3 sm:gap-6">
                {byMonth.map((b) => (
                  <span key={`${b.y}-${b.m}-l`} className={`flex-1 text-center text-xs ${b.current ? "font-semibold text-blue-700" : "text-gray-500"}`}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold">By category</h2>
              {byCategory.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500">No data yet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {byCategory.slice(0, 6).map(([name, n]) => (
                    <li key={name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate text-gray-700">{name}</span>
                        <span className="ml-3 shrink-0 tabular-nums text-gray-500">
                          {n} <span className="text-gray-300">·</span> {Math.round((n / Math.max(1, opportunities.length)) * 100)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${(n / maxCat) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Table */}
          <section id="opportunities" className="mt-4 scroll-mt-24 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-gray-200 px-4 pt-4 sm:px-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Opportunities</h2>
                  <p className="text-xs text-gray-500">Review, audit and remove listings across the platform.</p>
                </div>
              </div>

              <div className="-mb-px flex gap-5 overflow-x-auto" role="tablist">
                {([
                  ["all", "All", counts.all],
                  ["upcoming", "Upcoming", counts.upcoming],
                  ["past", "Past", counts.past],
                ] as const).map(([key, label, n]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium ${
                      tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {label}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs tabular-nums ${tab === key ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{n}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
              <label className="relative block flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icons.search}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title, location or organizer"
                  aria-label="Search opportunities"
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-48"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {selected.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-2.5 text-sm sm:px-5">
                <span className="font-medium text-blue-800">{selected.length} selected</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelected([])} className="rounded-md px-3 py-1.5 font-medium text-blue-800 hover:bg-blue-100">Clear</button>
                  <button
                    onClick={() => setPendingDelete(opportunities.filter((o) => selected.includes(o._id)))}
                    className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
                  >
                    Delete selected
                  </button>
                </div>
              </div>
            )}

            {/* Column headings */}
            <div className={`hidden gap-4 border-b border-gray-200 bg-gray-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:grid ${gridCols}`}>
              <input type="checkbox" checked={allOnPageSelected} onChange={togglePage} aria-label="Select all on this page" className="h-4 w-4 rounded border-gray-300" />
              <button onClick={() => toggleSort("title")} className="text-left uppercase hover:text-gray-900">Opportunity{sortMark("title")}</button>
              <span>Location</span>
              <button onClick={() => toggleSort("date")} className="text-left uppercase hover:text-gray-900">Date{sortMark("date")}</button>
              <button onClick={() => toggleSort("capacity")} className="text-left uppercase hover:text-gray-900">Slots{sortMark("capacity")}</button>
              <span>Organizer</span>
              <span className="text-right">Actions</span>
            </div>

            {loading ? (
              <div className="animate-pulse divide-y divide-gray-100" role="status" aria-label="Loading">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="h-4 w-4 rounded bg-gray-200" />
                    <div className="h-4 w-1/3 rounded bg-gray-200" />
                    <div className="h-4 w-1/5 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-semibold text-gray-800">
                  {opportunities.length === 0 ? "No opportunities yet" : "No results match your filters"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {opportunities.length === 0 ? "Listings created by NGOs will appear here." : "Try a different search or clear the filters."}
                </p>
                {opportunities.length > 0 && (
                  <button onClick={() => { setQuery(""); setCategory("all"); setTab("all"); }} className="mt-3 text-sm font-semibold text-blue-600 hover:underline">
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pageItems.map((o) => {
                  const up = isUpcoming(o.date);
                  const checked = selected.includes(o._id);
                  return (
                    <li
                      key={o._id}
                      className={`grid items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5 ${gridCols} ${checked ? "bg-blue-50/50" : "hover:bg-gray-50"}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleRow(o._id)} aria-label={`Select ${o.title}`} className="h-4 w-4 rounded border-gray-300" />

                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold">{o.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {o.category && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">{o.category}</span>
                          )}
                          <span className="font-mono text-[11px] text-gray-400">#{String(o._id).slice(-6)}</span>
                        </div>
                      </div>

                      <p className="min-w-0 break-words text-sm text-gray-700">
                        <span className="mr-1 text-xs font-medium text-gray-400 lg:hidden">Location:</span>
                        {o.location || "–"}
                      </p>

                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${up ? "bg-emerald-500" : "bg-gray-300"}`} title={up ? "Upcoming" : "Past"} />
                        <span className="tabular-nums">{formatDate(o.date)}</span>
                      </div>

                      <p className="text-sm tabular-nums text-gray-700">
                        <span className="mr-1 text-xs font-medium text-gray-400 lg:hidden">Slots:</span>
                        {o.capacity ?? "–"}
                      </p>

                      <div className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600">
                          {(o.organizer?.name || "?").charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{o.organizer?.name || "–"}</span>
                      </div>

                      <div className="flex items-center gap-1 lg:justify-end">
                        <Link href={`/opportunities/${o._id}`} className="rounded-md px-2.5 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">
                          View
                        </Link>
                        <button
                          onClick={() => setPendingDelete([o])}
                          aria-label={`Delete ${o.title}`}
                          title="Delete"
                          className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          {icons.trash}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Pagination */}
            {!loading && filtered.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span>
                  Showing <span className="font-semibold tabular-nums">{(safePage - 1) * PAGE_SIZE + 1}</span> to{" "}
                  <span className="font-semibold tabular-nums">{Math.min(safePage * PAGE_SIZE, filtered.length)}</span> of{" "}
                  <span className="font-semibold tabular-nums">{filtered.length}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage <= 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-1 tabular-nums">Page {safePage} of {totalPages}</span>
                  <button
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Delete confirmation */}
      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">{icons.trash}</span>
              <div className="min-w-0">
                <h3 id="delete-title" className="text-base font-semibold">
                  {pendingDelete.length === 1 ? "Delete opportunity?" : `Delete ${pendingDelete.length} opportunities?`}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {pendingDelete.length === 1 ? (
                    <>
                      <span className="font-semibold text-gray-900">{pendingDelete[0].title}</span> will be permanently removed from the platform.
                    </>
                  ) : (
                    "The selected opportunities will be permanently removed from the platform."
                  )}{" "}
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} disabled={deleting} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md border px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === "success" ? "border-emerald-200 bg-white text-emerald-700" : "border-red-200 bg-white text-red-700"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}