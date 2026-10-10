"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, getUser } from "@/lib/api";
import { photoSrc } from "@/components/ProfilePhoto";

type Ngo = {
  _id: string;
  name: string;
  email: string;
  city: string;
  about: string;
  website: string;
  verified: boolean;
  profilePhoto: string;
  createdAt: string;
  opportunities: number;
};

type Tab = "pending" | "verified" | "all";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminNgosPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const current = getUser();
    setUser(current);

    if (!current || current.role !== "admin") {
      setReady(true);
      return;
    }

    api("/admin/ngos")
      .then((data: any) => setNgos(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err.message || "Could not load NGOs"))
      .finally(() => setReady(true));
  }, []);

  async function setVerified(ngo: Ngo, verified: boolean) {
    if (!verified && !window.confirm(`Remove the Verified badge from ${ngo.name}?`)) return;

    setBusyId(ngo._id);
    setError("");
    setNotice("");
    try {
      await api(`/ngos/${ngo._id}/verify`, { method: "PATCH", body: { verified } });
      setNgos((items) => items.map((n) => (n._id === ngo._id ? { ...n, verified } : n)));
      setNotice(verified ? `${ngo.name} is now verified.` : `Badge removed from ${ngo.name}.`);
    } catch (err: any) {
      setError(err.message || "Could not update verification");
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(
    () => ({
      pending: ngos.filter((n) => !n.verified).length,
      verified: ngos.filter((n) => n.verified).length,
      all: ngos.length,
    }),
    [ngos]
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ngos.filter((n) => {
      if (tab === "pending" && n.verified) return false;
      if (tab === "verified" && !n.verified) return false;
      if (!q) return true;
      return `${n.name} ${n.email} ${n.city}`.toLowerCase().includes(q);
    });
  }, [ngos, tab, search]);

  if (!ready) {
    return <main className="mx-auto max-w-4xl px-4 py-16 text-center text-gray-500">Loading...</main>;
  }

  if (!user || user.role !== "admin") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-gray-700">This page is for administrators.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600">
          Log in
        </Link>
      </main>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "verified", label: "Verified" },
    { key: "all", label: "All" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">NGO verification</h1>
          <p className="mt-1 text-gray-600">
            Review each organisation, then give it the Verified badge.
          </p>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-blue-600 hover:underline">
          Back to admin
        </Link>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                tab === t.key ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or city"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 sm:w-72"
        />
      </div>

      <div className="mt-5 grid gap-3">
        {shown.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">
            {tab === "pending" && !search ? "No NGOs are waiting for verification." : "No NGOs match."}
          </p>
        )}

        {shown.map((ngo) => {
          const logo = photoSrc(ngo.profilePhoto);
          const busy = busyId === ngo._id;

          return (
            <div key={ngo._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {logo ? (
                  <img src={logo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                    {(ngo.name || "N").charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{ngo.name}</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        ngo.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {ngo.verified ? "Verified" : "Pending"}
                    </span>
                  </div>

                  <p className="mt-1 break-all text-sm text-gray-600">{ngo.email}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {[ngo.city, `${ngo.opportunities} opportunit${ngo.opportunities === 1 ? "y" : "ies"}`, `Joined ${formatDate(ngo.createdAt)}`]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>

                  {ngo.website && /^https?:\/\//i.test(ngo.website) && (
                    <a
                      href={ngo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block break-all text-sm font-semibold text-blue-600 hover:underline"
                    >
                      {ngo.website}
                    </a>
                  )}

                  {ngo.about && (
                    <p className="mt-2 line-clamp-3 break-words text-sm text-gray-700">{ngo.about}</p>
                  )}
                  {!ngo.about && !ngo.website && (
                    <p className="mt-2 text-sm text-gray-500">This NGO hasn't filled in its profile yet.</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <Link
                    href={`/ngos/${ngo._id}`}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    View profile
                  </Link>

                  {ngo.verified ? (
                    <button
                      onClick={() => setVerified(ngo, false)}
                      disabled={busy}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      {busy ? "Saving..." : "Remove badge"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setVerified(ngo, true)}
                      disabled={busy}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {busy ? "Saving..." : "Verify"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}