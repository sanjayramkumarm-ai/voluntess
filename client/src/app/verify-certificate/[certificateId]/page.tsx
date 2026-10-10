"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL, formatDay, formatIssued, formatMinutes } from "@/lib/certificates";

type Result =
  | { kind: "loading" }
  | { kind: "valid"; cert: any }
  | { kind: "revoked"; id: string; message: string }
  | { kind: "not_found" }
  | { kind: "unavailable" };

export default function VerifyCertificatePage() {
  const params = useParams();
  const raw: any = (params as any)?.certificateId;
  const id = String(Array.isArray(raw) ? raw[0] : raw || "");
  const [result, setResult] = useState<Result>({ kind: "loading" });

  const load = useCallback(async () => {
    setResult({ kind: "loading" });
    try {
      const res = await fetch(`${API_URL}/public/certificates/${encodeURIComponent(id)}/verify`, { cache: "no-store" });
      if (res.status === 404) return setResult({ kind: "not_found" });
      if (!res.ok) return setResult({ kind: "unavailable" });
      const data = await res.json();
      if (data.status === "valid") setResult({ kind: "valid", cert: data.certificate });
      else if (data.status === "revoked") setResult({ kind: "revoked", id: data.certificateId, message: data.message });
      else setResult({ kind: "unavailable" });
    } catch {
      setResult({ kind: "unavailable" });
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <style>{`@media print { header, nav { display: none !important; } }`}</style>

      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-center text-2xl font-extrabold text-gray-900">Volun<span className="text-blue-600">tess</span></p>
        <p className="mt-1 text-center text-sm text-gray-500">Certificate verification</p>

        {result.kind === "loading" && <p role="status" className="mt-10 text-center text-gray-500">Checking certificate...</p>}

        {result.kind === "valid" && (
          <div className="mt-8">
            <div role="status" className="rounded-2xl bg-green-50 p-5 text-center">
              <p className="text-xl font-extrabold text-green-700">Valid and verified</p>
              <p className="mt-1 text-sm text-green-800">This certificate was issued through Voluntess and has not been revoked.</p>
            </div>

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className="text-gray-500">Volunteer</dt><dd className="text-lg font-bold text-gray-900">{result.cert.volunteerName}</dd></div>
              <div className="sm:col-span-2"><dt className="text-gray-500">Opportunity</dt><dd className="break-words font-semibold text-gray-900">{result.cert.opportunityTitle}</dd></div>
              <div><dt className="text-gray-500">Issued by</dt><dd className="font-semibold text-gray-900">{result.cert.ngoName}</dd></div>
              <div><dt className="text-gray-500">Verified service hours</dt><dd className="font-semibold text-gray-900">{formatMinutes(result.cert.verifiedMinutes)}</dd></div>
              <div><dt className="text-gray-500">Completion date</dt><dd className="font-semibold text-gray-900">{formatDay(result.cert.completionDate, true)}</dd></div>
              <div><dt className="text-gray-500">Issue date</dt><dd className="font-semibold text-gray-900">{formatIssued(result.cert.issuedAt)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-gray-500">Certificate ID</dt><dd className="break-all font-mono text-gray-900">{result.cert.certificateId}</dd></div>
            </dl>

            <p className="mt-6 text-xs text-gray-500">
              This record confirms participation verified by the issuing organisation. It is not a government-issued or accredited qualification.
            </p>
            <button onClick={() => window.print()} className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 print:hidden">
              Print this page
            </button>
          </div>
        )}

        {result.kind === "revoked" && (
          <div role="alert" className="mt-8 rounded-2xl bg-red-50 p-6 text-center">
            <p className="text-xl font-extrabold text-red-700">Certificate revoked</p>
            <p className="mt-2 text-sm text-red-800">{result.message}</p>
            <p className="mt-3 break-all font-mono text-sm text-gray-700">{result.id}</p>
          </div>
        )}

        {result.kind === "not_found" && (
          <div role="alert" className="mt-8 rounded-2xl bg-amber-50 p-6 text-center">
            <p className="text-xl font-extrabold text-amber-700">Certificate not found</p>
            <p className="mt-2 text-sm text-amber-800">Check the certificate ID, or scan the QR code on the original certificate again.</p>
          </div>
        )}

        {result.kind === "unavailable" && (
          <div role="alert" className="mt-8 rounded-2xl bg-gray-50 p-6 text-center">
            <p className="text-xl font-extrabold text-gray-800">Verification is temporarily unavailable</p>
            <p className="mt-2 text-sm text-gray-600">Please try again in a moment.</p>
            <button onClick={load} className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Try again</button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-sm"><Link href="/" className="font-semibold text-blue-600 hover:underline">Back to Voluntess</Link></p>
    </main>
  );
}