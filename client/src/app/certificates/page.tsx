"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { formatIssued, formatMinutes } from "@/lib/certificates";
import { EmptyState, ErrorState, LoadingState } from "@/components/certificates/ui";
import { CertificateCard, CertificatePreview, ServiceHoursSummary } from "@/components/certificates/CertificateViews";

export default function CertificatesPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [year, setYear] = useState("");
  const [ngo, setNgo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ filter, sort, page: String(page), limit: "6" });
      if (search) params.set("q", search);
      if (year) params.set("year", year);
      if (ngo) params.set("ngo", ngo);
      const [s, list] = await Promise.all([api("/certificates/my/summary"), api(`/certificates/my?${params.toString()}`)]);
      setSummary(s);
      setData(list);
    } catch (err: any) {
      setError(err.message || "Could not load your certificates");
    } finally {
      setLoading(false);
    }
  }, [filter, sort, page, search, year, ngo]);

  useEffect(() => {
    const current = getUser();
    setUser(current);
    setReady(true);
  }, []);

  useEffect(() => {
    if (user && user.role === "volunteer") load();
  }, [user, load]);

  if (!ready) return <LoadingState />;

  if (!user || user.role !== "volunteer") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-700">Certificates are for volunteer accounts.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600">Log in</Link>
      </main>
    );
  }

  const select = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
  const noCerts = summary && summary.certificates === 0 && data && data.total === 0 && filter === "all" && !search && !year && !ngo;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-gray-900">My Certificates</h1>
      <p className="mt-1 text-gray-600">Certificates and service hours confirmed by the NGOs you volunteered with.</p>

      {error && <div className="mt-6"><ErrorState message={error} onRetry={load} /></div>}

      {summary && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Certificates earned</p><p className="mt-1 text-3xl font-extrabold text-gray-900">{summary.certificates}</p></div>
            <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Verified hours</p><p className="mt-1 text-3xl font-extrabold text-blue-600">{formatMinutes(summary.totalMinutes)}</p></div>
            <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Completed opportunities</p><p className="mt-1 text-3xl font-extrabold text-gray-900">{summary.completedOpportunities}</p></div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Most recent</p>
              {summary.latest ? (
                <>
                  <p className="mt-1 truncate font-bold text-gray-900">{summary.latest.opportunityTitle}</p>
                  <p className="text-sm text-gray-600">{formatIssued(summary.latest.issuedAt)}</p>
                </>
              ) : (
                <p className="mt-1 text-gray-500">None yet</p>
              )}
            </div>
          </div>
          <ServiceHoursSummary summary={summary} />
        </>
      )}

      <section className="mt-8">
        {noCerts ? (
          <EmptyState title="No certificates yet" text="When an NGO confirms your volunteering hours and issues a certificate, it will appear here.">
            <Link href="/explore" className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Explore opportunities</Link>
          </EmptyState>
        ) : (
          <>
            <form
              onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}
              className="flex flex-wrap items-center gap-2"
            >
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, NGO or ID" className={`${select} w-full sm:w-64`} />
              <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
              <select aria-label="Filter" value={filter} onChange={(e) => { setPage(1); setFilter(e.target.value); }} className={select}>
                <option value="all">All certificates</option>
                <option value="recent">Recently issued</option>
                <option value="verified">Verified only</option>
              </select>
              <select aria-label="Year" value={year} onChange={(e) => { setPage(1); setYear(e.target.value); }} className={select}>
                <option value="">Every year</option>
                {(data?.facets?.years || []).map((y: number) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select aria-label="NGO" value={ngo} onChange={(e) => { setPage(1); setNgo(e.target.value); }} className={select}>
                <option value="">Every NGO</option>
                {(data?.facets?.ngos || []).map((n: string) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select aria-label="Sort" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className={select}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="hours">Most hours</option>
                <option value="title">Title A-Z</option>
              </select>
            </form>

            <div className="mt-4 grid gap-4">
              {loading && !data ? (
                <LoadingState label="Loading certificates..." />
              ) : data && data.items.length === 0 ? (
                <EmptyState title="No matches" text="No certificates match these filters." />
              ) : (
                data?.items.map((c: any) => <CertificateCard key={c.certificateId} cert={c} onView={setSelected} />)
              )}
            </div>

            {data && data.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
                <span className="text-sm text-gray-600">Page {data.page} of {data.pages}</span>
                <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
              </div>
            )}
          </>
        )}
      </section>

      {selected && (
        <CertificatePreview
          cert={selected}
          onClose={() => setSelected(null)}
          onChanged={(c) => {
            setSelected(c);
            setData((d: any) => d && { ...d, items: d.items.map((i: any) => (i.certificateId === c.certificateId ? c : i)) });
          }}
        />
      )}
    </main>
  );
}