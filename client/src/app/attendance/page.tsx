"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getUser } from "@/lib/api";
import { formatDay, formatMinutes } from "@/lib/certificates";
import { fmtDateTime, stateOf } from "@/lib/attendance";
import { AttendanceBadge, FlagChips } from "@/components/attendance/parts";
import { EmptyState, ErrorState, LoadingState } from "@/components/certificates/ui";

type Tab = "all" | "approved" | "pending" | "rejected";

function Svg({ children, className = "h-4 w-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  scan: <Svg><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" /></Svg>,
  clock: <Svg className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  check: <Svg className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Svg>,
  hourglass: <Svg className="h-5 w-5"><path d="M6 3h12M6 21h12M7 3v3a5 5 0 0 0 2 4l1 2-1 2a5 5 0 0 0-2 4v3M17 3v3a5 5 0 0 1-2 4l-1 2 1 2a5 5 0 0 1 2 4v3" /></Svg>,
  calendar: <Svg className="h-5 w-5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>,
  award: <Svg className="h-5 w-5"><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8" /></Svg>,
  search: <Svg><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>,
  pin: <Svg><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Svg>,
  arrow: <Svg><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  info: <Svg><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>,
};

function dateParts(value?: string) {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) return { day: "-", month: "TBD" };
  return { day: String(d.getDate()), month: d.toLocaleDateString("en-IN", { month: "short" }) };
}

function bucket(a: any): Tab {
  if (a.verification === "approved") return "approved";
  if (a.verification === "rejected") return "rejected";
  return "pending";
}

export default function AttendancePage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api("/attendance/my"));
    } catch (err: any) {
      setError(err.message || "Could not load your attendance");
    }
  }, []);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setReady(true);
    if (u?.role === "volunteer") load();
  }, [load]);

  const history: any[] = data?.history || [];
  const upcoming: any[] = data?.upcoming || [];

  const counts = useMemo(() => {
    const c = { all: history.length, approved: 0, pending: 0, rejected: 0 };
    history.forEach((a) => {
      c[bucket(a)] += 1;
    });
    return c;
  }, [history]);

  const certificates = useMemo(() => history.filter((a) => a.certificateId).length, [history]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((a) => {
      if (tab !== "all" && bucket(a) !== tab) return false;
      if (!q) return true;
      return String(a.title || "").toLowerCase().includes(q);
    });
  }, [history, tab, query]);

  if (!ready) return <LoadingState />;
  if (!user || user.role !== "volunteer") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-700">Attendance is for volunteer accounts.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600">Log in</Link>
      </main>
    );
  }

  const tabs: [Tab, string][] = [
    ["all", "All"],
    ["approved", "Approved"],
    ["pending", "Pending"],
    ["rejected", "Rejected"],
  ];

  const kpis = data
    ? [
        { label: "Approved hours", value: formatMinutes(data.totals.approvedMinutes), note: "Verified by organizers", icon: icons.check, tone: "bg-emerald-50 text-emerald-600" },
        { label: "Waiting for approval", value: formatMinutes(data.totals.pendingMinutes), note: "Recorded, not yet verified", icon: icons.hourglass, tone: "bg-amber-50 text-amber-600" },
        { label: "Events attended", value: String(history.length), note: `${upcoming.length} upcoming`, icon: icons.calendar, tone: "bg-blue-50 text-blue-600" },
        { label: "Certificates", value: String(certificates), note: "Earned from service hours", icon: icons.award, tone: "bg-indigo-50 text-indigo-600" },
      ]
    : [];

  const gridCols = "lg:grid-cols-[minmax(0,2fr)_1.2fr_1.2fr_0.8fr_0.8fr_auto]";

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-gray-500">
              <Link href="/dashboard" className="hover:text-gray-800">Dashboard</Link>
              <span className="mx-1 text-gray-300">/</span>
              Attendance
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">My attendance</h1>
            <p className="mt-1 text-sm text-gray-500">Check-ins, check-outs and service hours for events you are approved for.</p>
          </div>
          <Link href="/scan" className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            {icons.scan} Scan to check in
          </Link>
        </div>

        {error && <div className="mt-6"><ErrorState message={error} onRetry={load} /></div>}

        {!data && !error && (
          <div className="mt-6 animate-pulse space-y-4" role="status" aria-label="Loading">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-lg border border-gray-200 bg-white" />
              ))}
            </div>
            <div className="h-48 rounded-lg border border-gray-200 bg-white" />
          </div>
        )}

        {data && (
          <>
            {/* KPIs */}
            <section aria-label="Attendance summary" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-lg border border-gray-200 bg-white p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium leading-4 text-gray-500 sm:text-sm">{k.label}</p>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-9 sm:w-9 ${k.tone}`}>{k.icon}</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:mt-3 sm:text-3xl">{k.value}</p>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500 sm:mt-1 sm:text-xs">{k.note}</p>
                </div>
              ))}
            </section>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* Side: upcoming */}
              <aside className="order-first min-w-0 space-y-4 lg:order-last lg:sticky lg:top-24 lg:self-start">
                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 px-5 py-4">
                    <h2 className="text-base font-semibold">Upcoming approved events</h2>
                    <p className="text-xs text-gray-500">Ready for check-in on the day.</p>
                  </div>

                  {upcoming.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-gray-500">No upcoming events waiting for check-in.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {upcoming.map((u: any) => {
                        const p = dateParts(u.date);
                        return (
                          <li key={u.applicationId} className="flex items-center gap-3 px-5 py-3.5">
                            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-blue-50 text-blue-700">
                              <span className="text-base font-bold leading-none tabular-nums">{p.day}</span>
                              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">{p.month}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold">{u.title}</p>
                              <p className="mt-0.5 text-xs text-gray-500">{formatDay(u.date, true)}</p>
                              {u.venue && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                                  <span className="text-gray-400">{icons.pin}</span>
                                  <span className="min-w-0 truncate">{u.venue}</span>
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="flex items-start gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3 text-xs leading-5 text-gray-500">
                    <span className="mt-0.5 shrink-0 text-gray-400">{icons.info}</span>
                    <p>On the event day, tap <span className="font-semibold text-gray-700">Scan to check in</span> and scan the organizer's QR code. Scan again to check out.</p>
                  </div>
                </section>
              </aside>

              {/* Main: history */}
              <section className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-4 pt-4 sm:px-5">
                  <div>
                    <h2 className="text-base font-semibold">Attendance history</h2>
                    <p className="text-xs text-gray-500">Every check-in and the hours recorded for it.</p>
                  </div>

                  <div className="-mb-px flex gap-5 overflow-x-auto" role="tablist">
                    {tabs.map(([key, label]) => (
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
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs tabular-nums ${tab === key ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                          {counts[key]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="p-5">
                    <EmptyState title="No attendance yet" text="After you scan an event's QR code and check in, it will appear here." />
                  </div>
                ) : (
                  <>
                    <div className="border-b border-gray-200 bg-gray-50/60 px-4 py-3 sm:px-5">
                      <label className="relative block">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icons.search}</span>
                        <input
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search by event name"
                          aria-label="Search attendance"
                          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>

                    <div className={`hidden gap-4 border-b border-gray-200 bg-gray-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:grid ${gridCols}`}>
                      <span>Event</span>
                      <span>Checked in</span>
                      <span>Checked out</span>
                      <span>Recorded</span>
                      <span>Approved</span>
                      <span className="text-right">Status</span>
                    </div>

                    {filtered.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <p className="text-sm font-semibold text-gray-800">No records match your filters</p>
                        <button onClick={() => { setTab("all"); setQuery(""); }} className="mt-3 text-sm font-semibold text-blue-600 hover:underline">
                          Reset filters
                        </button>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {filtered.map((a: any) => (
                          <li key={a._id} className={`grid items-start gap-x-4 gap-y-2 px-4 py-4 hover:bg-gray-50 sm:px-5 ${gridCols}`}>
                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold">{a.title}</p>
                              {a.reviewReason && (
                                <p className="mt-1 text-xs text-gray-600">Organiser note: {a.reviewReason}</p>
                              )}
                              <div className="mt-1"><FlagChips flags={a.flags} /></div>
                              {a.certificateId && (
                                <Link href="/certificates" className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
                                  View certificate {a.certificateId} {icons.arrow}
                                </Link>
                              )}
                            </div>

                            <p className="text-sm tabular-nums text-gray-700">
                              <span className="mr-1 text-xs font-medium text-gray-400 lg:hidden">Checked in:</span>
                              {fmtDateTime(a.checkInAt)}
                            </p>

                            <p className="text-sm tabular-nums text-gray-700">
                              <span className="mr-1 text-xs font-medium text-gray-400 lg:hidden">Checked out:</span>
                              {a.checkOutAt ? fmtDateTime(a.checkOutAt) : <span className="text-gray-400">Not yet</span>}
                            </p>

                            <p className="text-sm tabular-nums text-gray-700">
                              <span className="mr-1 text-xs font-medium text-gray-400 lg:hidden">Recorded:</span>
                              {a.checkOutAt ? formatMinutes(a.provisionalMinutes) : "-"}
                            </p>

                            <p className="text-sm font-semibold tabular-nums text-emerald-700">
                              <span className="mr-1 text-xs font-medium text-gray-400 lg:hidden">Approved:</span>
                              {a.verification === "approved" ? formatMinutes(a.approvedMinutes) : <span className="font-normal text-gray-400">-</span>}
                            </p>

                            <div className="lg:flex lg:justify-end">
                              <AttendanceBadge state={stateOf(a)} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}