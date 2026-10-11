"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getUser, logout } from "@/lib/api";
import { ProfilePhoto, photoSrc } from "@/components/ProfilePhoto";
import { EditProfile } from "@/components/EditProfile";

type Tab = "all" | "pending" | "accepted" | "rejected" | "withdrawn";

const STATUS: Record<string, { label: string; badge: string; dot: string }> = {
  pending: { label: "Pending review", badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  accepted: { label: "Approved", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Not accepted", badge: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  withdrawn: { label: "Withdrawn", badge: "bg-gray-100 text-gray-600 ring-gray-200", dot: "bg-gray-400" },
};

function formatDate(value?: string) {
  if (!value) return "No date";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Svg({ children, className = "h-4 w-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  list: <Svg className="h-5 w-5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>,
  clock: <Svg className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  check: <Svg className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Svg>,
  x: <Svg className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></Svg>,
  search: <Svg><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>,
  refresh: <Svg><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></Svg>,
  compass: <Svg><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>,
  trophy: <Svg><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></Svg>,
  award: <Svg><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8" /></Svg>,
  qr: <Svg><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v1M14 20h1M18 18h3v3" /></Svg>,
  logout: <Svg><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Svg>,
  arrow: <Svg><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationError, setApplicationError] = useState("");

  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [pendingWithdraw, setPendingWithdraw] = useState<any>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setUser(currentUser);

    if (currentUser.role === "ngo") {
      router.replace("/ngo");
      return;
    }

    if (currentUser.role === "admin") {
      router.replace("/admin");
      return;
    }

    // Fetch fresh user data from the server (email, profile photo)
    api("/auth/me")
      .then((freshUser) => {
        const merged = { ...currentUser, ...freshUser };
        setUser(merged);
        localStorage.setItem("voluntess_user", JSON.stringify(merged));
      })
      .catch(() => {
        // Keep the localStorage user if /auth/me fails
      });

    loadApplications(false);

    const interval = setInterval(() => {
      loadApplications(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [router]);

  async function loadApplications(silent = false) {
    try {
      if (!silent) setApplicationsLoading(true);
      setApplicationError("");

      const data = await api("/applications/mine");

      setApplications(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setApplicationError(error.message || "Failed to load applications");
    } finally {
      setApplicationsLoading(false);
    }
  }

  async function confirmWithdraw() {
    if (!pendingWithdraw) return;
    try {
      setWithdrawing(true);
      await api(`/applications/${pendingWithdraw._id}/withdraw`, { method: "PATCH" });
      await loadApplications(true);
      showToast("Application withdrawn.");
    } catch (error: any) {
      showToast(error.message || "Could not withdraw application", "error");
    } finally {
      setWithdrawing(false);
      setPendingWithdraw(null);
    }
  }

  const counts = useMemo(() => {
    const c = { all: applications.length, pending: 0, accepted: 0, rejected: 0, withdrawn: 0 };
    applications.forEach((a) => {
      const s = (a.status || "pending") as keyof typeof c;
      if (s in c) c[s] += 1;
    });
    return c;
  }, [applications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      const s = a.status || "pending";
      if (tab !== "all" && s !== tab) return false;
      if (!q) return true;
      return (
        String(a.opportunity?.title || "").toLowerCase().includes(q) ||
        String(a.opportunity?.location || "").toLowerCase().includes(q)
      );
    });
  }, [applications, tab, query]);

  const nextUp = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return applications
      .filter((a) => a.status === "accepted" && a.opportunity?.date && new Date(a.opportunity.date).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.opportunity.date).getTime() - new Date(b.opportunity.date).getTime())[0];
  }, [applications]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading dashboard...</p>
      </main>
    );
  }

  if (user.role === "ngo" || user.role === "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Opening your dashboard...</p>
      </main>
    );
  }

  const photo = photoSrc ? photoSrc(user.profilePhoto) : "";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const kpis = [
    { label: "Total applications", value: counts.all, note: `${counts.withdrawn} withdrawn`, icon: icons.list, tone: "text-blue-600 bg-blue-50" },
    { label: "Pending", value: counts.pending, note: "Awaiting NGO decision", icon: icons.clock, tone: "text-amber-600 bg-amber-50" },
    { label: "Approved", value: counts.accepted, note: "You are confirmed", icon: icons.check, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Not accepted", value: counts.rejected, note: "Explore other listings", icon: icons.x, tone: "text-red-600 bg-red-50" },
  ];

  const tabs: [Tab, string][] = [
    ["all", "All"],
    ["pending", "Pending"],
    ["accepted", "Approved"],
    ["rejected", "Not accepted"],
    ["withdrawn", "Withdrawn"],
  ];

  const quick = [
    { href: "/explore", label: "Explore opportunities", icon: icons.compass },
    { href: "/quests", label: "Voluntess Quest", icon: icons.trophy },
    { href: "/certificates", label: "My certificates", icon: icons.award },
    { href: "/attendance", label: "Attendance and check-in", icon: icons.qr },
  ];

  const gridCols = "lg:grid-cols-[minmax(0,2.4fr)_1.4fr_1.2fr_1.1fr_190px]";

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {photo ? (
              <img src={photo} alt={user.name || "Profile"} className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white shadow" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xl font-bold text-white">
                {(user.name || "V").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Volunteer <span className="mx-1 text-gray-300">/</span> Overview</p>
              <h1 className="truncate text-2xl font-bold tracking-tight">Welcome back, {user.name || "Volunteer"}</h1>
              <p className="text-sm text-gray-500">
                {today}
                {user.city ? <span> &middot; {user.city}</span> : null}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Link href="/explore" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {icons.compass} Explore opportunities
            </Link>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600">
              {icons.logout} Log out
            </button>
          </div>
        </div>

        {/* KPIs */}
        <section aria-label="Application summary" className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-gray-200 bg-white p-3 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium leading-4 text-gray-500 sm:text-sm">{k.label}</p>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-9 sm:w-9 ${k.tone}`}>{k.icon}</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:mt-3 sm:text-3xl">{applicationsLoading ? "–" : k.value}</p>
              <p className="mt-0.5 truncate text-[11px] text-gray-500 sm:mt-1 sm:text-xs">{k.note}</p>
            </div>
          ))}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Applications */}
          <section className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-gray-200 px-4 pt-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">My applications</h2>
                  <p className="text-xs text-gray-500">Status updates every 10 seconds.</p>
                </div>
                <button
                  onClick={() => loadApplications(false)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {icons.refresh} Refresh
                </button>
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

            <div className="border-b border-gray-200 bg-gray-50/60 px-4 py-3 sm:px-5">
              <label className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icons.search}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by opportunity or location"
                  aria-label="Search applications"
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className={`hidden gap-4 border-b border-gray-200 bg-gray-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:grid ${gridCols}`}>
              <span>Opportunity</span>
              <span>Location</span>
              <span>Date and time</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {applicationsLoading ? (
              <div className="animate-pulse divide-y divide-gray-100" role="status" aria-label="Loading">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2 px-5 py-4">
                    <div className="h-4 w-1/3 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : applicationError ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-semibold text-red-700">{applicationError}</p>
                <button onClick={() => loadApplications(false)} className="mt-3 text-sm font-semibold text-blue-600 hover:underline">
                  Try again
                </button>
              </div>
            ) : applications.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-semibold text-gray-800">No applications yet</p>
                <p className="mt-1 text-sm text-gray-500">Explore opportunities and apply for your first volunteering activity.</p>
                <Link href="/explore" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Explore opportunities
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-semibold text-gray-800">No applications match your filters</p>
                <button onClick={() => { setTab("all"); setQuery(""); }} className="mt-3 text-sm font-semibold text-blue-600 hover:underline">
                  Reset filters
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map((application) => {
                  const opportunity = application.opportunity;
                  const status = application.status || "pending";
                  const st = STATUS[status] || STATUS.pending;
                  const active = status === "pending" || status === "accepted";

                  return (
                    <li key={application._id} className={`grid items-center gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-gray-50 sm:px-5 ${gridCols}`}>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold">
                          {opportunity?.title || "Opportunity no longer available"}
                        </p>
                        {!opportunity && (
                          <p className="mt-0.5 text-xs text-gray-500">Removed by the NGO. Kept in your history.</p>
                        )}
                      </div>

                      <p className="min-w-0 break-words text-sm text-gray-700">
                        <span className="mr-1 text-xs font-medium text-gray-400 lg:hidden">Location:</span>
                        {opportunity?.location || "–"}
                      </p>

                      <p className="text-sm tabular-nums text-gray-700">
                        <span className="mr-1 text-xs font-medium text-gray-400 lg:hidden">When:</span>
                        {opportunity?.date ? formatDate(opportunity.date) : "–"}
                        {opportunity?.startTime ? <span className="text-gray-400"> &middot; {opportunity.startTime}</span> : null}
                      </p>

                      <div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${st.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 lg:justify-end">
                        {opportunity?._id && (
                          <Link href={`/opportunities/${opportunity._id}`} className="rounded-md px-2.5 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">
                            View
                          </Link>
                        )}
                        {active && (
                          <a href={`/messages?application=${application._id}`} className="rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                            Message
                          </a>
                        )}
                        {active && (
                          <button onClick={() => setPendingWithdraw(application)} className="rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600">
                            Withdraw
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Side column */}
          <aside className="min-w-0 space-y-4">
            {nextUp && (
              <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Next commitment</p>
                <p className="mt-2 font-semibold">{nextUp.opportunity.title}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {formatDate(nextUp.opportunity.date)}
                  {nextUp.opportunity.startTime ? ` at ${nextUp.opportunity.startTime}` : ""}
                </p>
                {nextUp.opportunity.location && <p className="text-sm text-gray-600">{nextUp.opportunity.location}</p>}
                <Link href={`/opportunities/${nextUp.opportunity._id}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
                  View details {icons.arrow}
                </Link>
              </section>
            )}

            <section className="rounded-lg border border-gray-200 bg-white p-2">
              <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Quick actions</p>
              <nav className="flex flex-col">
                {quick.map((q) => (
                  <Link key={q.href} href={q.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                    <span className="text-gray-400">{q.icon}</span>
                    <span className="flex-1">{q.label}</span>
                    <span className="text-gray-300">{icons.arrow}</span>
                  </Link>
                ))}
              </nav>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold">Account details</h2>
              <dl className="mt-3 divide-y divide-gray-100 text-sm">
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="min-w-0 truncate font-medium">{user.name || "Not available"}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="min-w-0 truncate font-medium">{user.email || "Not available"}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-gray-500">Role</dt>
                  <dd className="font-medium capitalize">{user.role || "Volunteer"}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>

        {/* Profile settings */}
        <section id="account" className="mt-4 scroll-mt-24 rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-base font-semibold">Profile settings</h2>
            <p className="text-xs text-gray-500">Update your photo, name, city and skills.</p>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
            <div>
              <ProfilePhoto
                name={user.name}
                photo={user.profilePhoto}
                onUpdated={(path) => {
                  const updated = { ...user, profilePhoto: path };
                  setUser(updated);
                  localStorage.setItem("voluntess_user", JSON.stringify(updated));
                  window.dispatchEvent(new Event("voluntess-user-updated"));
                }}
              />
            </div>

            <div className="min-w-0">
              <EditProfile
                user={user}
                onSaved={(updated) => {
                  const merged = { ...user, ...updated };
                  setUser(merged);
                  localStorage.setItem("voluntess_user", JSON.stringify(merged));
                  window.dispatchEvent(new Event("voluntess-user-updated"));
                }}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Withdraw confirmation */}
      {pendingWithdraw && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4"
          onClick={() => !withdrawing && setPendingWithdraw(null)}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 id="withdraw-title" className="text-base font-semibold">Withdraw application?</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {pendingWithdraw.opportunity?.title ? (
                <>
                  Your application for <span className="font-semibold text-gray-900">{pendingWithdraw.opportunity.title}</span> will be withdrawn.{" "}
                </>
              ) : null}
              Your spot will be given to another volunteer.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPendingWithdraw(null)} disabled={withdrawing} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Keep application
              </button>
              <button onClick={confirmWithdraw} disabled={withdrawing} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {withdrawing ? "Withdrawing…" : "Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] px-4 sm:px-0" aria-live="polite">
          <div className={`pointer-events-auto rounded-md border bg-white px-4 py-3 text-sm font-medium shadow-lg ${toast.type === "success" ? "border-emerald-200 text-emerald-700" : "border-red-200 text-red-700"}`}>
            {toast.text}
          </div>
        </div>
      )}
    </main>
  );
}