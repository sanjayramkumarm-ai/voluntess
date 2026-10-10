"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { formatDay, formatMinutes } from "@/lib/certificates";
import { CertificateDownloadButton, EmptyState, ErrorState, LoadingState, VerificationStatusBadge } from "@/components/certificates/ui";
import CompletionReviewTable from "@/components/certificates/CompletionReviewTable";

export default function NgoCompletionsPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [opps, setOpps] = useState<any[]>([]);
  const [oppId, setOppId] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [issued, setIssued] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOpps = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([api("/ngo/completion-opportunities"), api("/ngo/certificates")]);
      setOpps(Array.isArray(o) ? o : []);
      setIssued(Array.isArray(c) ? c : []);
    } catch (err: any) {
      setError(err.message || "Could not load your opportunities");
    }
  }, []);

  const loadRows = useCallback(async () => {
    if (!oppId) { setDetail(null); return; }
    setLoading(true);
    setError("");
    try {
      setDetail(await api(`/ngo/completions?opportunityId=${oppId}`));
      api("/ngo/certificates").then((c) => setIssued(Array.isArray(c) ? c : [])).catch(() => {});
    } catch (err: any) {
      setError(err.message || "Could not load the records");
    } finally {
      setLoading(false);
    }
  }, [oppId]);

  useEffect(() => {
    const current = getUser();
    setUser(current);
    setReady(true);
    if (current?.role === "ngo") loadOpps();
  }, [loadOpps]);

  useEffect(() => { loadRows(); }, [loadRows]);

  if (!ready) return <LoadingState />;

  if (!user || user.role !== "ngo") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-700">This page is for NGO accounts.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600">Log in</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Completion and certificates</h1>
          <p className="mt-1 text-gray-600">Record attendance, confirm service hours, then issue certificates.</p>
        </div>
        <Link href="/ngo" className="text-sm font-semibold text-blue-600 hover:underline">Back to NGO dashboard</Link>
      </div>

      {error && <div className="mt-6"><ErrorState message={error} onRetry={loadRows} /></div>}

      <div className="mt-6">
        <label className="block text-sm font-semibold text-gray-700">Opportunity</label>
        <select value={oppId} onChange={(e) => setOppId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-900">
          <option value="">Choose an opportunity</option>
          {opps.map((o) => (
            <option key={o._id} value={o._id}>
              {o.title} - {formatDay(o.date)} ({o.accepted} accepted)
            </option>
          ))}
        </select>
      </div>

      <section className="mt-6">
        {loading ? (
          <LoadingState label="Loading volunteers..." />
        ) : detail ? (
          detail.rows.length === 0 ? (
            <EmptyState title="No accepted volunteers" text="Volunteers appear here after you accept their applications." />
          ) : (
            <CompletionReviewTable rows={detail.rows} limits={detail.limits} reload={loadRows} />
          )
        ) : (
          <EmptyState title="Select an opportunity" text="Choose one of your opportunities to manage attendance and certificates." />
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900">Issued certificates</h2>
        {issued.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">You haven't issued any certificates yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
            {issued.map((c) => (
              <li key={c.certificateId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{c.volunteerName} - {c.opportunityTitle}</p>
                  <p className="text-sm text-gray-600">{formatMinutes(c.verifiedMinutes)} - <span className="font-mono">{c.certificateId}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <VerificationStatusBadge status={c.status} />
                  {c.status === "valid" && <CertificateDownloadButton certificateId={c.certificateId} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}