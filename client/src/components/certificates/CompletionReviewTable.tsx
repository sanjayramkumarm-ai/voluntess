"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatMinutes } from "@/lib/certificates";
import { CertificateDownloadButton, ConfirmDialog, VerificationStatusBadge } from "./ui";

type Kind = "verify" | "reject" | "issue" | "revoke" | null;

const REASONS: [string, string][] = [
  ["error_in_hours", "Error in hours"],
  ["wrong_volunteer", "Wrong volunteer"],
  ["participation_not_confirmed", "Participation not confirmed"],
  ["fraud", "Fraud or misuse"],
  ["other", "Other"],
];

function RowCard({ row, limits, reload }: { row: any; limits: any; reload: () => void }) {
  const c = row.completion;
  const [hours, setHours] = useState(c && c.submittedMinutes ? String(Math.floor(c.submittedMinutes / 60)) : "");
  const [minutes, setMinutes] = useState(c && c.submittedMinutes ? String(c.submittedMinutes % 60) : "");
  const [start, setStart] = useState(c?.startTime || "");
  const [end, setEnd] = useState(c?.endTime || "");
  const [note, setNote] = useState(c?.note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [dialog, setDialog] = useState<Kind>(null);
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("error_in_hours");

  const state: string = row.state;
  const certId: string | null = row.certificateId;
  const editable = !certId && state !== "verified" ? true : !certId && state === "verified";

  function body() {
    const b: any = {};
    if (hours !== "") b.hours = Number(hours);
    if (minutes !== "") b.minutes = Number(minutes);
    if (start) b.startTime = start;
    if (end) b.endTime = end;
    if (note.trim()) b.note = note.trim();
    return b;
  }

  async function run(fn: () => Promise<any>, success: string) {
    setBusy(true);
    setError("");
    setOk("");
    try {
      await fn();
      setDialog(null);
      setOk(success);
      reload();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setDialog(null);
    } finally {
      setBusy(false);
    }
  }

  const record = () => run(() => api("/ngo/completions", { method: "POST", body: { applicationId: row.applicationId, ...body() } }), "Attendance recorded.");
  const save = () => run(() => api(`/ngo/completions/${c._id}`, { method: "PATCH", body: body() }), "Hours saved. Confirm them to verify.");
  const verify = () => run(() => api(`/ngo/completions/${c._id}/verify`, { method: "POST", body: { confirmedMinutes: c.submittedMinutes } }), "Completion verified.");
  const rejectIt = () => run(() => api(`/ngo/completions/${c._id}/reject`, { method: "POST", body: { reason } }), "Completion rejected.");
  const issue = () => run(() => api(`/ngo/completions/${c._id}/issue-certificate`, { method: "POST" }), "Certificate issued.");
  const revoke = () => run(() => api(`/certificates/${certId}/revoke`, { method: "POST", body: { reasonCode: code } }), "Certificate revoked.");

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900";

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-gray-900">{row.volunteerName}</h3>
        <VerificationStatusBadge status={state} />
      </div>

      {c?.status === "rejected" && c.rejectionReason && (
        <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">Reason: {c.rejectionReason}</p>
      )}

      {certId ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">Verified {formatMinutes(c.verifiedMinutes)} - Certificate</span>
          <span className="font-mono text-sm text-gray-900">{certId}</span>
          <CertificateDownloadButton certificateId={certId} />
          <button onClick={() => setDialog("revoke")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
            Revoke
          </button>
        </div>
      ) : (
        <>
          {editable || state === "accepted" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <label className="text-sm text-gray-600">Hours<input type="number" min={0} max={24} value={hours} onChange={(e) => setHours(e.target.value)} className={input} /></label>
              <label className="text-sm text-gray-600">Minutes<input type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={input} /></label>
              <label className="text-sm text-gray-600">Start (optional)<input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} /></label>
              <label className="text-sm text-gray-600">End (optional)<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={input} /></label>
              <label className="text-sm text-gray-600 sm:col-span-4">Completion note (optional)
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className={input} />
              </label>
            </div>
          ) : null}

          <p className="mt-2 text-xs text-gray-500">
            Allowed per record: {formatMinutes(limits.minMinutes)} to {formatMinutes(limits.maxMinutes)}.
            {state === "verified" && " Editing a verified record sends it back for confirmation."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {state === "accepted" && (
              <button onClick={record} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Record attendance</button>
            )}
            {c && state !== "accepted" && (
              <button onClick={save} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                {state === "rejected" ? "Re-submit hours" : "Save hours"}
              </button>
            )}
            {state === "completion_pending" && (
              <button onClick={() => setDialog("verify")} disabled={busy} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">Confirm completion</button>
            )}
            {state === "verified" && (
              <button onClick={() => setDialog("issue")} disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">Issue certificate</button>
            )}
            {c && state !== "rejected" && (
              <button onClick={() => { setReason(""); setDialog("reject"); }} disabled={busy} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">Reject</button>
            )}
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {ok && <p className="mt-3 text-sm text-green-600">{ok}</p>}

      <ConfirmDialog
        open={dialog === "verify"} busy={busy} title="Confirm completion"
        text={`You are confirming that ${row.volunteerName} completed ${formatMinutes(c?.submittedMinutes || 0)} of service. This becomes a verified record.`}
        confirmLabel="Confirm hours" onConfirm={verify} onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "issue"} busy={busy} title="Issue certificate"
        text={`Issue a Certificate of Volunteering to ${row.volunteerName} for ${formatMinutes(c?.verifiedMinutes || 0)}? It will carry your NGO name.`}
        confirmLabel="Issue certificate" onConfirm={issue} onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "reject"} busy={busy} danger title="Reject completion"
        text="The volunteer will not receive verified hours for this record."
        confirmLabel="Reject" onConfirm={() => (reason.trim().length >= 3 ? rejectIt() : setError("Give a short reason"))} onCancel={() => setDialog(null)}
      >
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder="Reason" className={input} />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "revoke"} busy={busy} danger title="Revoke certificate"
        text="The certificate will show as revoked on the public page. You can correct the hours and issue a new one afterwards."
        confirmLabel="Revoke" onConfirm={revoke} onCancel={() => setDialog(null)}
      >
        <select value={code} onChange={(e) => setCode(e.target.value)} className={input}>
          {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </ConfirmDialog>
    </article>
  );
}

export default function CompletionReviewTable({ rows, limits, reload }: { rows: any[]; limits: any; reload: () => void }) {
  return (
    <div className="grid gap-4">
      {rows.map((r) => (
        <RowCard key={`${r.applicationId}-${r.completion?.updatedAt || "new"}-${r.certificateId || ""}`} row={r} limits={limits} reload={reload} />
      ))}
    </div>
  );
}