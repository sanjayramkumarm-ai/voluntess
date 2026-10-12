"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, getUser } from "@/lib/api";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ArrowIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function LeafIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <path d="M12 21v-8" />
      <path d="M12 13C12 8 8 5 3 5c0 5 3 8 9 8z" />
      <path d="M12 15c0-4 3-7 9-7 0 5-3 7-9 7z" />
    </svg>
  );
}

function HeartIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <path d="M12 21s-8-5.5-8-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 2.8C20 15.5 12 21 12 21z" />
    </svg>
  );
}

function UsersIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15.5c2.5.6 4 2.2 4 5" />
    </svg>
  );
}

function ChartIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <path d="M5 20V12M12 20V5M19 20V9" />
    </svg>
  );
}

function CapIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <path d="M2 9l10-5 10 5-10 5-10-5z" />
      <path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" />
    </svg>
  );
}

function PawIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <circle cx="6" cy="10" r="1.8" />
      <circle cx="10" cy="6" r="1.8" />
      <circle cx="14" cy="6" r="1.8" />
      <circle cx="18" cy="10" r="1.8" />
      <path d="M12 12c-3 0-5 2.5-5 4.5 0 1.5 1.2 2.5 2.7 2.5 1 0 1.5-.5 2.3-.5s1.3.5 2.3.5c1.5 0 2.7-1 2.7-2.5 0-2-2-4.5-5-4.5z" />
    </svg>
  );
}

function BuildingIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <path d="M3 9l9-5 9 5H3z" />
      <path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18" />
    </svg>
  );
}

function ShieldIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M8.5 12l2.5 2.5L16 9.5" />
    </svg>
  );
}

function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function AwardIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className} aria-hidden="true">
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14-1.5 8 5-3 5 3-1.5-8" />
    </svg>
  );
}

const causes = [
  { name: "Environment", tagline: "Greener communities", icon: <LeafIcon />, iconBox: "bg-green-100 text-green-600" },
  { name: "Education", tagline: "Empowering youth", icon: <CapIcon />, iconBox: "bg-blue-100 text-blue-600" },
  { name: "Health", tagline: "Stronger lives", icon: <HeartIcon />, iconBox: "bg-rose-100 text-rose-500" },
  { name: "Community", tagline: "Support and inclusion", icon: <UsersIcon />, iconBox: "bg-violet-100 text-violet-600" },
  { name: "Animals", tagline: "Care for all", icon: <PawIcon />, iconBox: "bg-orange-100 text-orange-500" },
  { name: "Social Welfare", tagline: "Build better societies", icon: <BuildingIcon />, iconBox: "bg-amber-100 text-amber-600" },
];

const steps = [
  { title: "Find a cause", text: "Browse verified opportunities near you and filter by cause, city and date.", icon: <CapIcon /> },
  { title: "Apply in one click", text: "Send your application. The NGO reviews it and confirms your spot.", icon: <UsersIcon /> },
  { title: "Show up and check in", text: "Scan the organizer's QR code at the event to record your hours.", icon: <ChartIcon /> },
  { title: "Earn recognition", text: "Collect XP, badges and verified certificates for your service.", icon: <AwardIcon /> },
];

const trust = [
  { title: "Verified opportunities", text: "Every listing is posted by a registered NGO and reviewed by our admins.", icon: <ShieldIcon /> },
  { title: "Track your impact", text: "Hours are recorded and approved by organizers, then turned into certificates.", icon: <ChartIcon /> },
  { title: "Trusted communities", text: "Message organizers directly and join a safe community of changemakers.", icon: <UsersIcon /> },
];

function shortDate(value?: string) {
  if (!value) return "Date TBD";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function dateParts(value?: string) {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) return { day: "-", month: "TBD" };
  return { day: String(d.getDate()), month: d.toLocaleDateString("en-IN", { month: "short" }) };
}

function isUpcoming(value?: string) {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d.getTime() >= t.getTime();
}

export default function HomePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());

    api("/opportunities")
      .then((data) => setItems(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  const stats = useMemo(() => {
    const ngos = new Set(items.map((o) => o.organizer?._id || o.organizer?.name).filter(Boolean)).size;
    const slots = items.reduce((sum, o) => sum + (Number(o.capacity) || 0), 0);
    const categories = new Set(items.map((o) => o.category).filter(Boolean)).size;
    return { total: items.length, ngos, slots, categories };
  }, [items]);

  const featured = useMemo(() => {
    const upcoming = items
      .filter((o) => isUpcoming(o.date))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const rest = items.filter((o) => !isUpcoming(o.date));
    return [...upcoming, ...rest].slice(0, 3);
  }, [items]);

  const spotlight = featured[0];

  const countFor = (name: string) => items.filter((o) => o.category === name).length;

  const dashboardHref = user?.role === "ngo" ? "/ngo" : user?.role === "admin" ? "/admin" : "/dashboard";

  const statCards = [
    { label: "Opportunities", value: stats.total },
    { label: "NGO partners", value: stats.ngos },
    { label: "Volunteer spots", value: stats.slots },
    { label: "Cause areas", value: stats.categories },
  ];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm text-gray-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              People &middot; Communities &middot; A Better Tomorrow
            </p>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Connect with people.
              <span className="block">Help your community.</span>
              <span className="block text-blue-600">Change lives.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
              Discover verified volunteer opportunities, apply in one click, and build a record of service that
              NGOs and employers can trust.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-blue-700"
              >
                Explore opportunities
                <ArrowIcon className="h-5 w-5" />
              </Link>

              {user ? (
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Go to my dashboard
                </Link>
              ) : (
                <Link
                  href="/login?mode=register"
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Join free
                </Link>
              )}
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {["Free for volunteers", "Verified NGOs", "Certificates for your hours"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg {...iconProps} strokeWidth={2.4} className="h-3 w-3" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Spotlight */}
          <div className="relative">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Happening soon</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                </span>
              </div>

              {!loaded ? (
                <div className="mt-4 animate-pulse rounded-lg border border-gray-200 bg-white p-5">
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="mt-4 h-6 w-3/4 rounded bg-gray-200" />
                  <div className="mt-4 h-3 w-full rounded bg-gray-100" />
                  <div className="mt-2 h-3 w-5/6 rounded bg-gray-100" />
                </div>
              ) : spotlight ? (
                <Link
                  href={`/opportunities/${spotlight._id}`}
                  className="group mt-4 block rounded-lg border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-blue-50 text-blue-700">
                      <span className="text-lg font-bold leading-none tabular-nums">{dateParts(spotlight.date).day}</span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{dateParts(spotlight.date).month}</span>
                    </div>
                    <div className="min-w-0">
                      {spotlight.category && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">{spotlight.category}</span>
                      )}
                      <h2 className="mt-1.5 break-words text-lg font-bold leading-snug">{spotlight.title}</h2>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-600">{spotlight.description}</p>

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-600">
                    {spotlight.location && (
                      <span className="flex items-center gap-1.5"><span className="text-gray-400"><PinIcon /></span>{spotlight.location}</span>
                    )}
                    <span className="flex items-center gap-1.5"><span className="text-gray-400"><CalendarIcon /></span>{shortDate(spotlight.date)}</span>
                    {spotlight.capacity ? (
                      <span className="flex items-center gap-1.5"><span className="text-gray-400"><UsersIcon className="h-4 w-4" /></span>{spotlight.capacity} volunteers needed</span>
                    ) : null}
                  </div>

                  <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                    View details <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </p>
                </Link>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                  <p className="text-sm font-semibold text-gray-800">New opportunities are coming soon</p>
                  <p className="mt-1 text-sm text-gray-500">NGOs publish new listings every week.</p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { v: stats.total, l: "Open now" },
                  { v: stats.ngos, l: "NGOs" },
                  { v: stats.slots, l: "Spots" },
                ].map((s) => (
                  <div key={s.l} className="rounded-md border border-gray-200 bg-white py-3">
                    <p className="text-xl font-bold tabular-nums">{loaded ? s.v : "-"}</p>
                    <p className="text-xs text-gray-500">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section aria-label="Platform numbers" className="mx-auto max-w-7xl px-4 sm:px-6">
        <dl className="-mt-6 grid grid-cols-2 divide-x divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm lg:grid-cols-4 lg:divide-y-0">
          {statCards.map((s) => (
            <div key={s.label} className="px-5 py-5 text-center sm:py-6">
              <dd className="text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">{loaded ? s.value : "-"}</dd>
              <dt className="mt-1 text-sm text-gray-500">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Featured opportunities */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Opportunities</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Volunteer opportunities near you</h2>
            <p className="mt-1 text-gray-500">Fresh listings from verified NGOs. Apply in one click.</p>
          </div>
          <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
            Browse all <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!loaded &&
            [0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-5">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="mt-4 h-5 w-2/3 rounded bg-gray-200" />
                <div className="mt-4 h-3 rounded bg-gray-100" />
                <div className="mt-2 h-3 w-5/6 rounded bg-gray-100" />
              </div>
            ))}

          {loaded && featured.length === 0 && (
            <p className="col-span-full rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              No opportunities yet. New listings will appear here when NGOs publish them.
            </p>
          )}

          {featured.map((o) => {
            const p = dateParts(o.date);
            const up = isUpcoming(o.date);
            return (
              <Link
                key={o._id}
                href={`/opportunities/${o._id}`}
                className="group flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md ${up ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                    <span className="text-lg font-bold leading-none tabular-nums">{p.day}</span>
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{p.month}</span>
                  </div>
                  <div className="min-w-0">
                    {o.category && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">{o.category}</span>
                    )}
                    <h3 className="mt-1.5 break-words text-base font-semibold leading-snug">{o.title}</h3>
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-600">{o.description}</p>
                <div className="mt-auto pt-4">
                  <div className="space-y-1.5 border-t border-gray-100 pt-4 text-sm text-gray-600">
                    {o.location && (
                      <p className="flex items-center gap-2"><span className="text-gray-400"><PinIcon /></span><span className="truncate">{o.location}</span></p>
                    )}
                    <p className="flex items-center gap-2"><span className="text-gray-400"><CalendarIcon /></span>{shortDate(o.date)}</p>
                  </div>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                    View details <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Causes */}
      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Causes</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">What do you care about?</h2>
            <p className="mt-1 text-gray-500">Choose a cause and start making a difference.</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {causes.map((cause) => {
              const n = countFor(cause.name);
              return (
                <Link
                  key={cause.name}
                  href={`/explore?category=${encodeURIComponent(cause.name)}`}
                  className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${cause.iconBox}`}>{cause.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{cause.name}</span>
                    <span className="block text-sm text-gray-500">{cause.tagline}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    {loaded && n > 0 && (
                      <span className="block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-700">{n} open</span>
                    )}
                    <span className="mt-1 block text-gray-300 transition group-hover:text-blue-600"><ArrowIcon className="ml-auto h-4 w-4" /></span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">How it works</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">From sign-up to certificate in four steps</h2>
        </div>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">{s.icon}</span>
                <span className="text-3xl font-extrabold tabular-nums text-gray-200">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm leading-6 text-gray-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Trust */}
      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          {trust.map((t) => (
            <div key={t.title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">{t.icon}</span>
              <div>
                <h3 className="font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NGO call to action */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 overflow-hidden rounded-xl bg-gray-900 p-8 text-white sm:p-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">For NGOs</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Need volunteers for your next event?</h2>
            <p className="mt-3 max-w-2xl text-gray-300">
              Post an opportunity in minutes, review applicants, check volunteers in with a QR code and issue
              verified certificates. It is free for registered organizations.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300">
              {["Post in minutes", "Review applicants", "QR check-in", "Verified certificates"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login?mode=register"
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3.5 text-base font-semibold text-gray-900 hover:bg-gray-100"
            >
              Register your NGO <ArrowIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      {!user && (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center sm:py-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to make a difference?</h2>
            <p className="mx-auto mt-2 max-w-xl text-gray-500">
              Create a free account and apply to your first opportunity today.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/login?mode=register" className="rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700">
                Join free
              </Link>
              <Link href="/explore" className="rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-800 hover:bg-gray-50">
                Explore opportunities
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="text-xl font-extrabold tracking-tight">
              Volun<span className="text-blue-600">tess</span>
            </p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500">
              Connecting volunteers with verified NGOs, one opportunity at a time.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Volunteers</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><Link href="/explore" className="hover:text-gray-900">Explore opportunities</Link></li>
              <li><Link href="/quests" className="hover:text-gray-900">Voluntess Quest</Link></li>
              <li><Link href="/certificates" className="hover:text-gray-900">Certificates</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Organizations</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><Link href="/login?mode=register" className="hover:text-gray-900">Register your NGO</Link></li>
              <li><Link href="/ngo" className="hover:text-gray-900">NGO dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><Link href="/login" className="hover:text-gray-900">Log in</Link></li>
              <li><Link href="/login?mode=register" className="hover:text-gray-900">Sign up</Link></li>
              <li><Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100">
          <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-gray-400 sm:px-6">
            &copy; {new Date().getFullYear()} Voluntess. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}