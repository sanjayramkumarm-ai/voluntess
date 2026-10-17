"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { photoSrc } from "@/components/ProfilePhoto";

function Icon({ children, className = "h-5 w-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function Avatar({ user, size = "h-16 w-16", text = "text-xl" }: { user: any; size?: string; text?: string }) {
  const [failed, setFailed] = useState(false);
  const src = photoSrc(user?.profilePhoto);
  useEffect(() => setFailed(false), [user?.profilePhoto]);
  if (src && !failed) {
    return <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover`} onError={() => setFailed(true)} />;
  }
  return (
    <span className={`flex ${size} ${text} shrink-0 items-center justify-center rounded-full bg-slate-900 font-semibold text-white`}>
      {(user?.name || "N").charAt(0).toUpperCase()}
    </span>
  );
}

type Stats = { events: number; upcoming: number; volunteers: number; certificates: number };

export function NgoHero() {
  const [user, setUser] = useState<any>(null);
  const [s, setS] = useState<Stats | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setUser(getUser());
    Promise.all([api("/ngo/completion-opportunities"), api("/ngo/certificates")])
      .then(([o, c]: any[]) => {
        const opps = Array.isArray(o) ? o : [];
        const certs = Array.isArray(c) ? c : [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setS({
          events: opps.length,
          upcoming: opps.filter((x: any) => x.date && new Date(x.date).getTime() >= today.getTime()).length,
          volunteers: opps.reduce((n: number, x: any) => n + (x.accepted || 0), 0),
          certificates: certs.filter((x: any) => x.status === "valid").length,
        });
        setState("ready");
      })
      .catch(() => {
        setS(null);
        setState("error");
      });
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateText = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const place = user?.city || user?.location || "";

  const stats: { label: string; value?: number; hint: string; tone: string; icon: React.ReactNode }[] = [
    { label: "Opportunities", value: s?.events, hint: "Total published", tone: "bg-blue-50 text-blue-600", icon: <Icon><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Icon> },
    { label: "Upcoming events", value: s?.upcoming, hint: "Scheduled activities", tone: "bg-amber-50 text-amber-600", icon: <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon> },
    { label: "Approved volunteers", value: s?.volunteers, hint: "People making impact", tone: "bg-emerald-50 text-emerald-600", icon: <Icon><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></Icon> },
    { label: "Certificates issued", value: s?.certificates, hint: "Verified contributions", tone: "bg-violet-50 text-violet-600", icon: <Icon><circle cx="12" cy="9" r="6" /><path d="M8.5 14.5 7 22l5-3 5 3-1.5-7.5" /></Icon> },
  ];

  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar user={user} />
            <div className="min-w-0">
              <p className="text-sm text-slate-500">NGO <span className="px-1 text-slate-300">/</span> Overview</p>
              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {greeting}, {user?.name || "there"}
              </h1>
              <p className="text-sm text-slate-500">{dateText}{place ? ` · ${place}` : ""}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link href="/ngo/create" className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:col-span-1">
              <Icon className="h-4 w-4"><path d="M12 5v14M5 12h14" /></Icon>
              New opportunity
            </Link>
            <Link href="/ngo/attendance" className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-5">
              Attendance &amp; QR
            </Link>
            <Link href="/ngo/completions" className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-5">
              Certificates
            </Link>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-4">
          {stats.map((st) => (
            <div key={st.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs text-slate-600 sm:text-sm">{st.label}</dt>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${st.tone}`}>{st.icon}</span>
              </div>
              <dd className="mt-3 text-2xl font-bold text-slate-900 sm:mt-5 sm:text-3xl">
                {state === "loading" ? (
                  <span className="block h-8 w-10 animate-pulse rounded bg-slate-200" />
                ) : state === "error" ? (
                  <span className="text-slate-300">&ndash;</span>
                ) : (
                  st.value ?? 0
                )}
              </dd>
              <p className="mt-1 text-xs text-slate-500">{st.hint}</p>
            </div>
          ))}
        </dl>
        {state === "error" && (
          <p className="mt-3 text-sm text-slate-600">Could not load stats. Check that the backend is running and refresh.</p>
        )}
      </div>
    </section>
  );
}

export function NgoOverview({ onRefresh }: { onRefresh?: (...args: any[]) => any }) {
  const [user, setUser] = useState<any>(null);
  useEffect(() => setUser(getUser()), []);

  const id = user?.id || user?._id || "";

  const actions: { href: string; title: string; icon: React.ReactNode }[] = [
    { href: "/ngo/create", title: "Create opportunity", icon: <Icon><path d="M12 5v14M5 12h14" /></Icon> },
    { href: "/ngo/attendance", title: "Attendance & QR", icon: <Icon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v7M14 20h3" /></Icon> },
    { href: "/ngo/completions", title: "Certificates", icon: <Icon><circle cx="12" cy="9" r="6" /><path d="M8.5 14.5 7 22l5-3 5 3-1.5-7.5" /></Icon> },
    { href: "/messages", title: "Messages", icon: <Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Icon> },
  ];

  return (
    <section className="w-full bg-slate-50">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar user={user} size="h-14 w-14" text="text-lg" />
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">Public profile</h2>
                  <p className="text-sm text-slate-500">Keep your logo and description updated to attract more applicants.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/ngo/profile" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">Edit profile</Link>
                <Link href={id ? `/ngos/${id}` : "/ngo"} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">View public page</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">My opportunities</h2>
              <p className="text-sm text-slate-500">To review volunteers, use the <span className="font-semibold text-slate-700">Applicants</span> button on an opportunity above.</p>
            </div>
            {onRefresh && (
              <button type="button" onClick={() => onRefresh()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <Icon className="h-4 w-4"><path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" /></Icon>
                Refresh
              </button>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick actions</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {actions.map((a) => (
                <li key={a.href}>
                  <Link href={a.href} className="group flex items-center gap-3 py-3 text-sm font-medium text-slate-800 transition hover:text-blue-600">
                    <span className="text-slate-400 group-hover:text-blue-600">{a.icon}</span>
                    <span className="flex-1">{a.title}</span>
                    <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600">&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Account details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Name</dt>
                <dd className="truncate font-semibold text-slate-900">{user?.name || "-"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Email</dt>
                <dd className="truncate font-semibold text-slate-900">{user?.email || "-"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Role</dt>
                <dd className="font-semibold text-slate-900">NGO</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}