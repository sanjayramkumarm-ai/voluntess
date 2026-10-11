"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { photoSrc } from "@/components/ProfilePhoto";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      {children}
    </svg>
  );
}

export function NgoHero() {
  const [user, setUser] = useState<any>(null);
  const [s, setS] = useState<{ events: number; upcoming: number; volunteers: number; certificates: number } | null>(null);

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
      })
      .catch(() => setS(null));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const stats: [string, number | undefined][] = [
    ["Opportunities", s?.events],
    ["Upcoming events", s?.upcoming],
    ["Approved volunteers", s?.volunteers],
    ["Certificates issued", s?.certificates],
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">NGO dashboard</p>
            <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">
              {greeting}, {user?.name || "there"}
            </h1>
            <p className="mt-2 max-w-xl text-blue-100">Create opportunities, welcome volunteers and recognise their service.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/ngo/create" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow hover:bg-blue-50">
              + New opportunity
            </Link>
            <Link href="/ngo/attendance" className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
              Attendance &amp; QR
            </Link>
            <Link href="/ngo/completions" className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
              Certificates
            </Link>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <dt className="text-xs font-medium text-blue-100">{label}</dt>
              <dd className="mt-1 text-3xl font-extrabold">{value === undefined ? "-" : value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function NgoOverview({ onRefresh }: { onRefresh?: (...args: any[]) => any }) {
  const [user, setUser] = useState<any>(null);
  useEffect(() => setUser(getUser()), []);

  const id = user?.id || user?._id || "";
  const src = photoSrc(user?.profilePhoto);

  const tiles: { href: string; title: string; text: string; tone: string; icon: React.ReactNode }[] = [
    { href: "/ngo/create", title: "Create opportunity", text: "Publish a new volunteering event.", tone: "bg-blue-50 text-blue-600", icon: <Icon><path d="M12 5v14M5 12h14" /></Icon> },
    { href: "/ngo/attendance", title: "Attendance & QR", text: "Check-in QR codes and hours to approve.", tone: "bg-indigo-50 text-indigo-600", icon: <Icon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v7M14 20h3" /></Icon> },
    { href: "/ngo/completions", title: "Certificates", text: "Verify hours and issue certificates.", tone: "bg-emerald-50 text-emerald-600", icon: <Icon><circle cx="12" cy="9" r="6" /><path d="M8.5 14.5 7 22l5-3 5 3-1.5-7.5" /></Icon> },
    { href: "/messages", title: "Messages", text: "Chat with your volunteers.", tone: "bg-amber-50 text-amber-600", icon: <Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Icon> },
  ];

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          {src ? (
            <img src={src} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
              {(user?.name || "N").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">Your public profile</h2>
            <p className="text-sm text-gray-500">Add your logo and description so volunteers can learn about your NGO.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/ngo/profile" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Edit public profile</Link>
          <Link href={id ? `/ngos/${id}` : "/ngo"} className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">View public page</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.tone}`}>{t.icon}</span>
            <h3 className="mt-4 font-bold text-gray-900">{t.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{t.text}</p>
            <span className="mt-3 inline-block text-sm font-semibold text-blue-600 group-hover:underline">Open &rarr;</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
        <p>To review volunteers, use the <strong className="font-semibold text-gray-700">Applicants</strong> button on an opportunity below.</p>
        {onRefresh && (
          <button type="button" onClick={() => onRefresh()} className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
            Refresh opportunities
          </button>
        )}
      </div>
    </section>
  );
}