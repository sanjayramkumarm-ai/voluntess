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

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {children}
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
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

function OpportunityList({ items, empty, muted }: { items: any[]; empty: string; muted?: boolean }) {
  if (!items || items.length === 0) {
    return <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">{empty}</p>;
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const p = dateParts(item.date);
        return (
          <Link
            key={item._id}
            href={`${OPPORTUNITY_PATH}/${item._id}`}
            className={`group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${muted ? "opacity-80" : ""}`}
          >
            <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl ${muted ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-700"}`}>
              <span className="text-xl font-extrabold leading-none">{p.day}</span>
              <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">{p.month}</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-900">{item.title}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {item.location && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{item.location}</span>}
                {item.category && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">{item.category}</span>}
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{formatDate(item.date)}</span>
              </div>
            </div>

            <span aria-hidden="true" className="shrink-0 text-lg font-bold text-blue-600 transition group-hover:translate-x-1">&rarr;</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function NgoProfilePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
        <p className="text-gray-700">{error}</p>
        <Link href="/explore" className="mt-4 inline-block font-semibold text-blue-600">
          Back to Explore
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10" role="status" aria-label="Loading">
        <div className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="h-40 bg-gray-200" />
          <div className="space-y-3 p-8">
            <div className="h-6 w-1/3 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-100" />
          </div>
        </div>
      </main>
    );
  }

  const { ngo, upcoming, past, stats } = data;
  const logo = photoSrc(ngo.profilePhoto);
  const website = ngo.website && /^https?:\/\//i.test(ngo.website) ? ngo.website : "";
  const since = ngo.createdAt ? new Date(ngo.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";

  const statCards = [
    { label: "Opportunities", value: stats?.opportunities ?? 0, tone: "bg-blue-50 text-blue-600", icon: <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon> },
    { label: "Completed", value: stats?.completed ?? 0, tone: "bg-emerald-50 text-emerald-600", icon: <Icon><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Icon> },
    { label: "Volunteers helped", value: stats?.volunteersHelped ?? 0, tone: "bg-indigo-50 text-indigo-600", icon: <Icon><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></Icon> },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      {/* Header */}
      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 sm:h-40" />
        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {logo ? (
                <img src={logo} alt={ngo.name} className="h-24 w-24 rounded-full bg-white object-cover shadow-md ring-4 ring-white sm:h-28 sm:w-28" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white shadow-md ring-4 ring-white sm:h-28 sm:w-28">
                  {(ngo.name || "N").charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 sm:pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-2xl font-extrabold text-gray-900 sm:text-3xl">{ngo.name}</h1>
                  {ngo.verified && <VerifiedBadge />}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  {ngo.city && <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{ngo.city}</span>}
                  {since && <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">Member since {since}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:pb-1">
              <button type="button" onClick={share} className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">
                {copied ? "Link copied" : "Share"}
              </button>
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                  Visit website
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Impact */}
      <section aria-label="Impact" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>{s.icon}</span>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">About</h2>
            {ngo.about ? (
              <p className="mt-2 whitespace-pre-line leading-7 text-gray-700">{ngo.about}</p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">This NGO hasn't added a description yet.</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-gray-900">Upcoming opportunities</h2>
            <OpportunityList items={upcoming} empty="No upcoming opportunities right now. Check back soon." />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-gray-900">Past opportunities</h2>
            <OpportunityList items={past} empty="No past opportunities yet." muted />
          </section>
        </div>

        {/* Side column */}
        <aside className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="mt-1">{ngo.verified ? <VerifiedBadge /> : <span className="font-semibold text-gray-700">Not verified yet</span>}</dd>
              </div>
              {ngo.city && (
                <div>
                  <dt className="text-gray-500">Location</dt>
                  <dd className="font-semibold text-gray-900">{ngo.city}</dd>
                </div>
              )}
              {website && (
                <div>
                  <dt className="text-gray-500">Website</dt>
                  <dd>
                    <a href={website} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-blue-600 hover:underline">{website}</a>
                  </dd>
                </div>
              )}
              {since && (
                <div>
                  <dt className="text-gray-500">On Voluntess since</dt>
                  <dd className="font-semibold text-gray-900">{since}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <NgoReviews ngoId={id} />
          </section>
        </aside>
      </div>
    </main>
  );
}