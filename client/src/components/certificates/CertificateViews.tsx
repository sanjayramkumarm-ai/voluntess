"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatDay, formatIssued, formatMinutes } from "@/lib/certificates";
import { CertificateDownloadButton, VerificationStatusBadge } from "./ui";

export function CertificateCard({ cert, onView }: { cert: any; onView: (c: any) => void }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{cert.title}</p>
          <h3 className="mt-1 break-words text-lg font-bold text-gray-900">{cert.opportunityTitle}</h3>
          <p className="text-sm text-gray-600">Issued by {cert.ngoName}</p>
        </div>
        <VerificationStatusBadge status={cert.status} />
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div><dt className="text-gray-500">Volunteer</dt><dd className="font-medium text-gray-900">{cert.volunteerName}</dd></div>
        <div><dt className="text-gray-500">Verified hours</dt><dd className="font-medium text-gray-900">{formatMinutes(cert.verifiedMinutes)}</dd></div>
        <div><dt className="text-gray-500">Completed</dt><dd className="font-medium text-gray-900">{formatDay(cert.completionDate)}</dd></div>
        <div><dt className="text-gray-500">Issued</dt><dd className="font-medium text-gray-900">{formatIssued(cert.issuedAt)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-gray-500">Certificate ID</dt><dd className="break-all font-mono text-gray-900">{cert.certificateId}</dd></div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => onView(cert)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          View certificate
        </button>
        {cert.status === "valid" && <CertificateDownloadButton certificateId={cert.certificateId} />}
      </div>
    </article>
  );
}

export function CertificatePreview({
  cert, onClose, onChanged,
}: { cert: any; onClose: () => void; onChanged: (c: any) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/verify-certificate/${cert.certificateId}` : "";

  async function togglePrivacy(showName: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const updated = await api(`/certificates/${cert.certificateId}/privacy`, { method: "PATCH", body: { showName } });
      onChanged(updated);
    } catch (err: any) {
      setMsg(err.message || "Could not save the setting");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMsg("Verification link copied.");
    } catch {
      setMsg(link);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="rounded-xl border-4 border-double border-blue-200 p-6 text-center">
          <p className="text-2xl font-extrabold text-gray-900">Volun<span className="text-blue-600">tess</span></p>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-700">{cert.title}</p>
          <p className="mt-4 text-sm text-gray-500">Presented to</p>
          <p className="break-words text-2xl font-extrabold text-blue-600">{cert.volunteerName}</p>
          <p className="mt-3 text-sm text-gray-500">for volunteering on</p>
          <p className="break-words text-lg font-bold text-gray-900">{cert.opportunityTitle}</p>
          <p className="text-sm text-gray-600">organised by {cert.ngoName}</p>
          <p className="mt-3 font-bold text-gray-900">Verified service hours: {formatMinutes(cert.verifiedMinutes)}</p>
          <p className="text-sm text-gray-600">Completed on {formatDay(cert.completionDate, true)}</p>
          <p className="mt-3 break-all font-mono text-xs text-gray-700">{cert.certificateId}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <VerificationStatusBadge status={cert.status} />
          <button onClick={copy} className="text-sm font-semibold text-blue-600 hover:underline">Copy verification link</button>
          {cert.status === "valid" && <CertificateDownloadButton certificateId={cert.certificateId} />}
        </div>

        <label className="mt-4 flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={cert.showNamePublicly}
            disabled={busy}
            onChange={(e) => togglePrivacy(e.target.checked)}
            className="mt-0.5 h-5 w-5"
          />
          <span>Show my full name on the public verification page. When off, only initials are shown.</span>
        </label>

        {msg && <p className="mt-3 break-all text-sm text-gray-600">{msg}</p>}

        <div className="mt-5 text-right">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { name: string; minutes: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="font-bold text-gray-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No verified hours yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate text-gray-800">{r.name}</span>
                <span className="shrink-0 font-semibold text-gray-900">{formatMinutes(r.minutes)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(4, (r.minutes / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ServiceHoursSummary({ summary }: { summary: any }) {
  return (
    <section aria-label="Verified service hours" className="mt-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">This month</p><p className="mt-1 text-2xl font-extrabold text-gray-900">{formatMinutes(summary.monthMinutes)}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">This year</p><p className="mt-1 text-2xl font-extrabold text-gray-900">{formatMinutes(summary.yearMinutes)}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">All time</p><p className="mt-1 text-2xl font-extrabold text-blue-600">{formatMinutes(summary.totalMinutes)}</p></div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Breakdown title="Hours by NGO" rows={summary.byNgo || []} />
        <Breakdown title="Hours by category" rows={summary.byCategory || []} />
        <Breakdown title="Hours by opportunity" rows={summary.byOpportunity || []} />
      </div>
    </section>
  );
}