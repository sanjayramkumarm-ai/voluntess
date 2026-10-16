"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import { photoSrc } from "../../../components/ProfilePhoto";
import NgoReviews from "../../../components/NgoReviews";

// Change this if your opportunity detail pages live somewhere else
const OPPORTUNITY_PATH = "/opportunities";

function formatDate(value?: string) {
  if (!value) return "No date";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function dateParts(value?: string) {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) return { day: "-", month: "" };
  return { day: String(d.getDate()), month: d.toLocaleDateString("en-IN", { month: "short" }) };
}

function Icon({ children, className = "h-5 w-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0z"
          clipRule="evenodd"
        />
      </svg>
      Verified NGO
    </span>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function OpportunityList({ items, empty, muted }: { items: any[]; empty: string; muted?: boolean }) {
  if (!items || items.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const p = dateParts(item.date);
        return (
          <li key={item._id}>
            <Link
              href={`${OPPORTUNITY_PATH}/${item._id}`}
              className={`group -mx-3 flex items-center gap-4 rounded-lg px-3 py-3.5 transition hover:bg-slate-50 ${muted ? "opacity-80" : ""}`}
            >
              <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg ${muted ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"}`}>
                <span className="text-lg font-bold leading-none">{p.day}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{p.month}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">{item.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {item.location && (
                    <span className="inline-flex items-center gap-1">
                      <Icon className="h-3.5 w-3.5"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Icon>
                      {item.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Icon className="h-3.5 w-3.5"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></Icon>
                    {formatDate(item.date)}
                  </span>
                  {item.category && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{item.category}</span>
                  )}
                </div>
              </div>

              <Icon className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"><path d="m9 6 6 6-6 6" /></Icon>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function NgoProfilePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    api(`/ngos/${id}`)
      .then(setData)
      .catch((err: any) => setError(err.message || "Could not load this NGO"));
  }, [id]);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-700">{error}</p>
        <Link href="/explore" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
          &larr; Back to Explore
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6" role="status" aria-label="Loading">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-24 w-24 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-1/3 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-24 rounded-xl border border-slate-200 bg-white" />
          <div className="h-48 rounded-xl border border-slate-200 bg-white" />
        </div>
      </main>
    );
  }

  const { ngo, upcoming, past, stats } = data;
  const logo = photoSrc(ngo.profilePhoto);
  const website = ngo.website && /^https?:\/\//i.test(ngo.website) ? ngo.website : "";
  const since = ngo.createdAt ? new Date(ngo.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";

  const statItems = [
    { label: "Opportunities", value: stats?.opportunities ?? 0, tone: "bg-blue-50 text-blue-600", icon: <Icon><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></Icon> },
    { label: "Completed", value: stats?.completed ?? 0, tone: "bg-emerald-50 text-emerald-600", icon: <Icon><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Icon> },
    { label: "Volunteers helped", value: stats?.volunteersHelped ?? 0, tone: "bg-indigo-50 text-indigo-600", icon: <Icon><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></Icon> },
  ];

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <nav className="text-sm text-slate-500">
          <Link href="/explore" className="hover:text-slate-900">Explore</Link>
          <span className="px-2 text-slate-300">/</span>
          <span className="text-slate-700">{ngo.name}</span>
        </nav>

        {/* Header */}
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              {logo && !logoFailed ? (
                <img
                  src={logo}
                  alt={ngo.name}
                  onError={() => setLogoFailed(true)}
                  className="h-24 w-24 shrink-0 rounded-full bg-white object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white">
                  {(ngo.name || "N").charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{ngo.name}</h1>
                  {ngo.verified && <VerifiedBadge />}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-500">
                  {ngo.city && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-4 w-4"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Icon>
                      {ngo.city}
                    </span>
                  )}
                  {since && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-4 w-4"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></Icon>
                      Member since {since}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2.5">
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Icon className="h-4 w-4"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></Icon>
                {copied ? "Link copied" : "Share"}
              </button>
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Visit website
                  <Icon className="h-4 w-4"><path d="M7 17 17 7M8 7h9v9" /></Icon>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Impact strip */}
        <section aria-label="Impact" className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <dl className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {statItems.map((s) => (
              <div key={s.label} className="flex items-center gap-4 p-5">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${s.tone}`}>{s.icon}</span>
                <div>
                  <dd className="text-2xl font-bold text-slate-900">{s.value}</dd>
                  <dt className="text-sm text-slate-500">{s.label}</dt>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main column */}
          <div className="min-w-0 space-y-6">
            <Card title="About">
              {ngo.about ? (
                <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{ngo.about}</p>
              ) : (
                <p className="text-sm text-slate-500">This NGO hasn't added a description yet.</p>
              )}
            </Card>

            <Card
              title="Upcoming opportunities"
              action={<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{upcoming?.length ?? 0}</span>}
            >
              <OpportunityList items={upcoming} empty="No upcoming opportunities right now. Check back soon." />
            </Card>

            <Card
              title="Past opportunities"
              action={<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{past?.length ?? 0}</span>}
            >
              <OpportunityList items={past} empty="No past opportunities yet." muted />
            </Card>
          </div>

          {/* Side column */}
          <aside className="min-w-0 space-y-6">
            <Card title="Details">
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between gap-4 pb-3">
                  <dt className="text-slate-500">Status</dt>
                  <dd>{ngo.verified ? <VerifiedBadge /> : <span className="font-semibold text-slate-700">Not verified yet</span>}</dd>
                </div>
                {ngo.city && (
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-slate-500">Location</dt>
                    <dd className="text-right font-semibold text-slate-900">{ngo.city}</dd>
                  </div>
                )}
                {website && (
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-slate-500">Website</dt>
                    <dd className="min-w-0 text-right">
                      <a href={website} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-blue-600 hover:underline">
                        {website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                      </a>
                    </dd>
                  </div>
                )}
                {since && (
                  <div className="flex items-center justify-between gap-4 pt-3">
                    <dt className="text-slate-500">On Voluntess since</dt>
                    <dd className="text-right font-semibold text-slate-900">{since}</dd>
                  </div>
                )}
              </dl>
            </Card>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <NgoReviews ngoId={id} />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}