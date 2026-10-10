"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import { photoSrc } from "../../../components/ProfilePhoto";
import NgoReviews from "../../../components/NgoReviews";

// Change this if your opportunity detail pages live somewhere else
const OPPORTUNITY_PATH = "/opportunities";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
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

function OpportunityList({ items, empty }: { items: any[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{empty}</p>;
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Link
          key={item._id}
          href={`${OPPORTUNITY_PATH}/${item._id}`}
          className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
        >
          <p className="font-semibold text-gray-900">{item.title}</p>
          <p className="mt-1 text-sm text-gray-600">
            {formatDate(item.date)} · {item.location} · {item.category}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default function NgoProfilePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api(`/ngos/${id}`)
      .then(setData)
      .catch((err: any) => setError(err.message || "Could not load this NGO"));
  }, [id]);

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
    return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">Loading...</main>;
  }

  const { ngo, upcoming, past, stats } = data;
  const logo = photoSrc(ngo.profilePhoto);
  const website = ngo.website && /^https?:\/\//i.test(ngo.website) ? ngo.website : "";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section className="flex flex-col items-center gap-5 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:text-left">
        {logo ? (
          <img src={logo} alt={ngo.name} className="h-24 w-24 rounded-full object-cover ring-2 ring-blue-100" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white">
            {(ngo.name || "N").charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-extrabold text-gray-900">{ngo.name}</h1>
            {ngo.verified && <VerifiedBadge />}
          </div>

          {ngo.city && <p className="mt-1 text-gray-600">{ngo.city}</p>}

          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block break-all text-sm font-semibold text-blue-600 hover:underline"
            >
              {website}
            </a>
          )}
        </div>
      </section>

      {ngo.about && (
        <section className="mt-6">
          <h2 className="text-lg font-bold text-gray-900">About</h2>
          <p className="mt-2 whitespace-pre-line leading-7 text-gray-700">{ngo.about}</p>
        </section>
      )}

      <NgoReviews ngoId={id} />

      <section className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-2xl font-bold text-blue-700">{stats.opportunities}</p>
          <p className="text-xs text-gray-600">Opportunities</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-2xl font-bold text-blue-700">{stats.completed}</p>
          <p className="text-xs text-gray-600">Completed</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-2xl font-bold text-blue-700">{stats.volunteersHelped}</p>
          <p className="text-xs text-gray-600">Volunteers</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Upcoming opportunities</h2>
        <OpportunityList items={upcoming} empty="No upcoming opportunities right now." />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Past opportunities</h2>
        <OpportunityList items={past} empty="No past opportunities yet." />
      </section>
    </main>
  );
}