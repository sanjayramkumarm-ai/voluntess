"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { photoSrc } from "@/components/ProfilePhoto";

function Icon({
  children,
  className = "h-6 w-6",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <Icon className="h-4 w-4 transition-transform group-hover:translate-x-1">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}

export function NgoHero() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<{
    events: number;
    upcoming: number;
    volunteers: number;
    certificates: number;
  } | null>(null);

  useEffect(() => {
    setUser(getUser());

    Promise.all([
      api("/ngo/completion-opportunities"),
      api("/ngo/certificates"),
    ])
      .then(([opportunities, certificates]: any[]) => {
        const events = Array.isArray(opportunities) ? opportunities : [];
        const certs = Array.isArray(certificates) ? certificates : [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        setStats({
          events: events.length,
          upcoming: events.filter(
            (item: any) =>
              item.date &&
              new Date(item.date).getTime() >= today.getTime()
          ).length,
          volunteers: events.reduce(
            (total: number, item: any) => total + (item.accepted || 0),
            0
          ),
          certificates: certs.filter(
            (item: any) => item.status === "valid"
          ).length,
        });
      })
      .catch(() => setStats(null));
  }, []);

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";

  const statItems = [
    {
      label: "Opportunities",
      value: stats?.events,
      description: "Total published",
      icon: (
        <Icon>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </Icon>
      ),
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Upcoming events",
      value: stats?.upcoming,
      description: "Scheduled activities",
      icon: (
        <Icon>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </Icon>
      ),
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      label: "Approved volunteers",
      value: stats?.volunteers,
      description: "People making impact",
      icon: (
        <Icon>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </Icon>
      ),
      color: "bg-violet-100 text-violet-700",
    },
    {
      label: "Certificates issued",
      value: stats?.certificates,
      description: "Verified contributions",
      icon: (
        <Icon>
          <circle cx="12" cy="8" r="5" />
          <path d="m8.5 12.5-1.5 9 5-3 5 3-1.5-9" />
        </Icon>
      ),
      color: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.3),transparent_40%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              NGO dashboard
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              {greeting}, {user?.name || "there"}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Create meaningful opportunities, coordinate volunteers, and
              measure your community impact from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/ngo/create"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <span className="mr-2 text-lg">+</span>
              New opportunity
            </Link>

            <Link
              href="/ngo/attendance"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Attendance &amp; QR
            </Link>

            <Link
              href="/ngo/completions"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Certificates
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.12]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    {item.label}
                  </p>

                  <p className="mt-3 text-4xl font-extrabold tracking-tight">
                    {item.value === undefined ? (
                      <span className="text-xl text-slate-400">Loading...</span>
                    ) : (
                      item.value
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {item.description}
                  </p>
                </div>

                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.color}`}
                >
                  {item.icon}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NgoOverview({
  onRefresh,
}: {
  onRefresh?: (...args: any[]) => any;
}) {
  const [user, setUser] = useState<any>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    setPhotoFailed(false);
  }, [user?.profilePhoto]);

  const id = user?.id || user?._id || "";
  const src = photoSrc(user?.profilePhoto);

  const tiles = [
    {
      href: "/ngo/create",
      title: "Create opportunity",
      text: "Publish a new volunteering event.",
      label: "Start creating",
      tone: "bg-blue-50 text-blue-600",
      icon: (
        <Icon>
          <path d="M12 5v14M5 12h14" />
        </Icon>
      ),
    },
    {
      href: "/ngo/attendance",
      title: "Attendance & QR",
      text: "Manage check-ins and approve service hours.",
      label: "Manage attendance",
      tone: "bg-indigo-50 text-indigo-600",
      icon: (
        <Icon>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v7M14 20h3" />
        </Icon>
      ),
    },
    {
      href: "/ngo/completions",
      title: "Certificates",
      text: "Verify hours and recognize volunteer contributions.",
      label: "Review certificates",
      tone: "bg-emerald-50 text-emerald-600",
      icon: (
        <Icon>
          <circle cx="12" cy="9" r="6" />
          <path d="M8.5 14.5 7 22l5-3 5 3-1.5-7.5" />
        </Icon>
      ),
    },
    {
      href: "/messages",
      title: "Messages",
      text: "Stay connected with your volunteers.",
      label: "Open messages",
      tone: "bg-amber-50 text-amber-600",
      icon: (
        <Icon>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        </Icon>
      ),
    },
  ];

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col justify-between gap-6 rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/60 p-5 shadow-sm sm:p-7 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4">
          {src && !photoFailed ? (
            <img
              src={src}
              alt={user?.name || "NGO profile"}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-md ring-4 ring-white"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-md ring-4 ring-white">
              {(user?.name || "N").charAt(0).toUpperCase()}
            </span>
          )}

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Public profile
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Show volunteers who you are
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Keep your logo and description updated to build trust and attract
              more applicants.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/ngo/profile"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Edit public profile
          </Link>

          <Link
            href={id ? `/ngos/${id}` : "/ngo"}
            className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-blue-50"
          >
            View public page
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
          >
            <div className="flex items-start justify-between">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-110 ${tile.tone}`}
              >
                {tile.icon}
              </span>

              <span className="text-slate-300 transition group-hover:text-blue-500">
                <ArrowIcon />
              </span>
            </div>

            <h3 className="mt-6 text-lg font-bold text-slate-900">
              {tile.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {tile.text}
            </p>

            <span className="mt-auto pt-6 text-sm font-bold text-blue-600">
              {tile.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
        <p>
          To review volunteers, use the{" "}
          <strong className="font-semibold text-slate-700">
            Applicants
          </strong>{" "}
          button on an opportunity below.
        </p>

        {onRefresh && (
          <button
            type="button"
            onClick={() => onRefresh()}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Refresh opportunities
          </button>
        )}
      </div>
    </section>
  );
}