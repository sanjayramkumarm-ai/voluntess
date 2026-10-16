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

  const stats: { label: string; value?: number }[] = [
    { label: "Opportunities", value: s?.events },
    { label: "Upcoming events", value: s?.upcoming },
    { label: "Approved volunteers", value: s?.volunteers },
    { label: "Certificates issued", value: s?.certificates },
  ];

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-gray-900">
              {greeting}, {user?.name || "there"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">Manage your opportunities, volunteers and certificates.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/ngo/create" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700">
              New opportunity
            </Link>
            <Link href="/ngo/attendance" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
              Attendance &amp; QR
            </Link>
            <Link href="/ngo/completions" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
              Certificates
            </Link>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 divide-x divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 lg:grid-cols-4 lg:divide-y-0">
          {stats.map((st) => (
            <div key={st.label} className="bg-white p-5">
              <dt className="text-sm text-gray-500">{st.label}</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {state === "loading" ? (
                  <span className="block h-7 w-10 animate-pulse rounded bg-gray-200" />
                ) : state === "error" ? (
                  <span className="text-gray-400">&ndash;</span>
                ) : (
                  st.value ?? 0
                )}
              </dd>
            </div>
          ))}
        </dl>
        {state === "error" && (
          <p className="mt-3 text-sm text-gray-600">Could not load stats. Check that the backend is running and refresh.</p>
        )}
      </div>
    </section>
  );
}

export function NgoOverview({ onRefresh }: { onRefresh?: (...args: any[]) => any }) {
  const [user, setUser] = useState<any>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setUser(getUser()), []);
  useEffect(() => setPhotoFailed(false), [user?.profilePhoto]);

  const id = user?.id || user?._id || "";
  const src = photoSrc(user?.profilePhoto);

  const tiles: { href: string; title: string; text: string; icon: React.ReactNode }[] = [
    { href: "/ngo/create", title: "Create opportunity", text: "Publish a new volunteering event.", icon: <Icon><path d="M12 5v14M5 12h14" /></Icon> },
    { href: "/ngo/attendance", title: "Attendance & QR", text: "Check-in QR codes and hours to approve.", icon: <Icon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v7M14 20h3" /></Icon> },
    { href: "/ngo/completions", title: "Certificates", text: "Verify hours and issue certificates.", icon: <Icon><circle cx="12" cy="9" r="6" /><path d="M8.5 14.5 7 22l5-3 5 3-1.5-7.5" /></Icon> },
    { href: "/messages", title: "Messages", text: "Chat with your volunteers.", icon: <Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Icon> },
  ];

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {src && !photoFailed ? (
            <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" onError={() => setPhotoFailed(true)} />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900 text-lg font-semibold text-white">
              {(user?.name || "N").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Public profile</h2>
            <p className="text-sm text-gray-500">Keep your logo and description updated to attract more applicants.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ngo/profile" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700">Edit profile</Link>
          <Link href={id ? `/ngos/${id}` : "/ngo"} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">View public page</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 transition hover:border-gray-400"
          >
            <span className="text-gray-700">{t.icon}</span>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">{t.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{t.text}</p>
            <span className="mt-auto pt-4 text-sm font-medium text-gray-900">
              Open <span className="inline-block transition group-hover:translate-x-1">&rarr;</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-500">
        <p>To review volunteers, use the <strong className="font-medium text-gray-800">Applicants</strong> button on an opportunity below.</p>
        {onRefresh && (
          <button type="button" onClick={() => onRefresh()} className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50">
            Refresh
          </button>
        )}
      </div>
    </section>
  );
}