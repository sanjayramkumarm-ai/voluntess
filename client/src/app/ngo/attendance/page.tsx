"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { formatDay, formatMinutes } from "@/lib/certificates";
import { fetchBlob, fmtDateTime, saveBlob, toLocalInput } from "@/lib/attendance";
import { AttendanceBadge, FlagChips } from "@/components/attendance/parts";
import { ConfirmDialog, EmptyState, ErrorState, LoadingState } from "@/components/certificates/ui";

type Kind = "manual_in" | "manual_out" | "approve" | "reject" | "correct" | "times" | "rotate" | "revoke" | null;

export default function NgoAttendancePage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [opps, setOpps] = useState<any[]>([]);
  const [oppId, setOppId] = useState("");
  const [data, setData] = useState<any>(null);
  const [qr, setQr] = useState<any>(null);
  const [qrImg, setQrImg] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");

  const [dlg, setDlg] = useState<Kind>(null);
  const [row, setRow] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [hh, setHh] = useState("");
  const [mm, setMm] = useState("");
  const [inAt, setInAt] = useState("");
  const [outAt, setOutAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState("");

  const load = useCallback(async () => {
    if (!oppId) return;
    setError("");
    try {
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      if (status !== "all") qs.set("status", status);
      if (date) qs.set("date", date);
      const [d, info] = await Promise.all([api(`/ngo/attendance/event/${oppId}?${qs.toString()}`), api(`/ngo/attendance/event/${oppId}/qr`)]);
      setData(d);
      setQr(info);
    } catch (err: any) {
      setError(err.message || "Could not load attendance");
    }
  }, [oppId, q, status, date]);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setReady(true);
    if (u?.role === "ngo") api("/ngo/completion-opportunities").then((o: any) => setOpps(Array.isArray(o) ? o : [])).catch((e: any) => setError(e.message));
  }, []);

  useEffect(() => {
    setData(null);
    setQr(null);
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    let url = "";
    let alive = true;
    setQrImg("");
    if (oppId && qr?.state === "active") {
      fetchBlob(`/ngo/attendance/event/${oppId}/qr.png`)
        .then((b) => {
          if (!alive) return;
          url = URL.createObjectURL(b);
          setQrImg(url);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [oppId, qr?.state, qr?.version]);

  function open(kind: Kind, r?: any) {
    setRow(r || null);
    setReason("");
    setDlgError("");
    const mins = r ? (r.state === "approved" ? r.approvedMinutes : r.provisionalMinutes) : 0;
    setHh(mins ? String(Math.floor(mins / 60)) : "");
    setMm(mins ? String(mins % 60) : "");
    setInAt(toLocalInput(r?.checkInAt));
    setOutAt(toLocalInput(r?.checkOutAt));
    setDlg(kind);
  }

  async function submit() {
    setDlgError("");
    const needReason = ["manual_in", "manual_out", "reject", "correct", "times"].includes(String(dlg));
    if (needReason && reason.trim().length < 3) return setDlgError("Give a short reason");
    setBusy(true);
    try {
      if (dlg === "manual_in" || dlg === "manual_out") {
        await api("/ngo/attendance/manual", { method: "POST", body: { applicationId: row.applicationId, action: dlg === "manual_in" ? "check_in" : "check_out", reason: reason.trim() } });
      } else if (dlg === "approve") {
        await api(`/ngo/attendance/records/${row.attendanceId}/review`, { method: "POST", body: { action: "approve", confirmedMinutes: row.provisionalMinutes } });
      } else if (dlg === "reject") {
        await api(`/ngo/attendance/records/${row.attendanceId}/review`, { method: "POST", body: { action: "reject", reason: reason.trim() } });
      } else if (dlg === "correct") {
        await api(`/ngo/attendance/records/${row.attendanceId}/review`, { method: "POST", body: { action: "correct", minutes: Number(hh || 0) * 60 + Number(mm || 0), reason: reason.trim() } });
      } else if (dlg === "times") {
        if (!inAt) throw new Error("Enter the check-in time");
        await api(`/ngo/attendance/records/${row.attendanceId}/times`, {
          method: "PATCH",
          body: { checkInAt: new Date(inAt).toISOString(), checkOutAt: outAt ? new Date(outAt).toISOString() : null, reason: reason.trim() },
        });
      } else if (dlg === "rotate") {
        await api(`/ngo/attendance/event/${oppId}/qr/rotate`, { method: "POST" });
      } else if (dlg === "revoke") {
        await api(`/ngo/attendance/event/${oppId}/qr/revoke`, { method: "POST" });
      }
      setDlg(null);
      setMsg("Saved.");
      await load();
    } catch (err: any) {
      setDlgError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function download(path: string, name: string) {
    setMsg("");
    try {
      await saveBlob(path, name);
    } catch (err: any) {
      setError(err.message || "Download failed");
    }
  }

  async function markReviewed(id: string) {
    try {
      await api(`/ngo/attendance/attempts/${id}/review`, { method: "POST" });
      load();
    } catch (err: any) {
      setError(err.message || "Could not update");
    }
  }

  if (!ready) return <LoadingState />;
  if (!user || user.role !== "ngo") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-700">This page is for NGO accounts.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600">Log in</Link>
      </main>
    );
  }

  const input = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900";
  const btn = "rounded-lg px-3 py-1.5 text-xs font-semibold";
  const actions = (r: any): [string, Kind, string][] => {
    if (r.certificateId) return [];
    if (r.state === "not_attended") return [["Check in manually", "manual_in", "border border-gray-300 text-gray-700"]];
    if (r.state === "checked_in") return [["Check out manually", "manual_out", "border border-gray-300 text-gray-700"], ["Edit times", "times", "border border-gray-300 text-gray-700"]];
    if (r.state === "pending") return [["Approve", "approve", "bg-green-600 text-white"], ["Reject", "reject", "border border-red-200 text-red-600"], ["Correct hours", "correct", "border border-gray-300 text-gray-700"], ["Edit times", "times", "border border-gray-300 text-gray-700"]];
    return [["Correct hours", "correct", "border border-gray-300 text-gray-700"], ["Edit times", "times", "border border-gray-300 text-gray-700"]];
  };

  const s = data?.stats;
  const title: Record<string, string> = {
    manual_in: "Check in manually", manual_out: "Check out manually", approve: "Approve hours", reject: "Reject hours",
    correct: "Correct hours", times: "Edit check-in and check-out times", rotate: "Create a new QR code", revoke: "Revoke QR code",
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Event attendance</h1>
          <p className="mt-1 text-gray-600">QR check-in, attendance and service-hour approval.</p>
        </div>
        <Link href="/ngo/completions" className="text-sm font-semibold text-blue-600 hover:underline">Certificates</Link>
      </div>

      {error && <div className="mt-6"><ErrorState message={error} onRetry={load} /></div>}
      {msg && <p className="mt-4 text-sm font-semibold text-green-700">{msg}</p>}

      <div className="mt-6">
        <label className="block text-sm font-semibold text-gray-700">Event</label>
        <select value={oppId} onChange={(e) => setOppId(e.target.value)} className={`${input} mt-1 py-3`}>
          <option value="">Choose an event</option>
          {opps.map((o) => <option key={o._id} value={o._id}>{o.title} - {formatDay(o.date)} ({o.accepted} approved)</option>)}
        </select>
      </div>

      {!oppId && <div className="mt-6"><EmptyState title="Select an event" text="Choose one of your events to see its QR code and attendance." /></div>}

      {oppId && !data && !error && <div className="mt-6"><LoadingState /></div>}

      {data && qr && (
        <>
          <section className="mt-6 grid gap-6 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[260px_1fr]">
            <div className="flex items-center justify-center rounded-xl bg-gray-50 p-3">
              {qrImg ? <img src={qrImg} alt="Event check-in QR code" className="h-56 w-56" /> : <p className="p-6 text-center text-sm text-gray-500">{qr.state === "active" ? "Loading QR..." : `QR code ${qr.state}`}</p>}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Check-in QR code</p>
              <h2 className="mt-1 break-words text-xl font-bold text-gray-900">{qr.event.title}</h2>
              <p className="text-sm text-gray-600">{formatDay(qr.event.date, true)}{qr.event.venue ? ` - ${qr.event.venue}` : ""}</p>
              <p className="mt-2 text-sm text-gray-600">
                Status: <span className={`font-bold ${qr.state === "active" ? "text-green-700" : "text-red-700"}`}>{qr.state}</span>
                {qr.state === "active" && <> - valid until {fmtDateTime(qr.expiresAt)}</>}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button disabled={qr.state !== "active"} onClick={() => download(`/ngo/attendance/event/${oppId}/qr.png`, "Voluntess-CheckIn.png")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Download PNG</button>
                <button disabled={qr.state !== "active"} onClick={() => download(`/ngo/attendance/event/${oppId}/qr.pdf`, "Voluntess-CheckIn.pdf")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Download poster (PDF)</button>
                <button onClick={() => open("rotate")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">New QR code</button>
                {qr.state === "active" && <button onClick={() => open("revoke")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">Revoke</button>}
              </div>
              <p className="mt-3 text-xs text-gray-500">A new QR code makes the old printed one stop working.</p>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {[
              ["Registered", s.registered], ["Checked in now", s.checkedIn], ["Checked out", s.checkedOut], ["Not attended", s.notAttended],
              ["Completion", `${s.completionPercent}%`], ["Hours to approve", s.pendingApprovals], ["Needs review", s.suspicious],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">{k}</p><p className="mt-1 text-2xl font-extrabold text-gray-900">{v}</p></div>
            ))}
          </section>

          <section className="mt-6">
            <form onSubmit={(e) => { e.preventDefault(); setQ(qInput.trim()); }} className="flex flex-wrap items-center gap-2">
              <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search volunteer" className={`${input} sm:w-56`} />
              <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
              <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${input} sm:w-52`}>
                <option value="all">All statuses</option>
                <option value="not_attended">Not attended</option>
                <option value="checked_in">Checked in</option>
                <option value="pending">Hours pending</option>
                <option value="approved">Hours approved</option>
                <option value="rejected">Hours rejected</option>
              </select>
              <input aria-label="Check-in date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${input} sm:w-44`} />
              <button type="button" onClick={() => download(`/ngo/attendance/event/${oppId}/export.csv`, "attendance.csv")} className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Export CSV</button>
            </form>

            {data.rows.length === 0 ? (
              <div className="mt-4"><EmptyState title="No volunteers to show" text="Approved volunteers appear here. Try clearing the filters." /></div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
                    <tr><th className="p-3">Volunteer</th><th className="p-3">Check-in</th><th className="p-3">Check-out</th><th className="p-3">Provisional</th><th className="p-3">Approved</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-900">
                    {data.rows.map((r: any) => (
                      <tr key={r.applicationId} className="align-top">
                        <td className="p-3 font-semibold">{r.volunteerName}<div className="mt-1"><FlagChips flags={r.flags} /></div></td>
                        <td className="p-3">{fmtDateTime(r.checkInAt)}</td>
                        <td className="p-3">{fmtDateTime(r.checkOutAt)}</td>
                        <td className="p-3">{r.checkOutAt ? formatMinutes(r.provisionalMinutes) : "-"}</td>
                        <td className="p-3">{r.state === "approved" ? formatMinutes(r.approvedMinutes) : "-"}</td>
                        <td className="p-3"><AttendanceBadge state={r.state} />{r.certificateId && <div className="mt-1 font-mono text-[11px] text-gray-500">{r.certificateId}</div>}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {actions(r).map(([label, kind, cls]) => <button key={label} onClick={() => open(kind, r)} className={`${btn} ${cls}`}>{label}</button>)}
                            {r.certificateId && <span className="text-xs text-gray-500">Revoke the certificate to edit</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">Attempts needing review</h2>
            {data.attempts.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Nothing to review.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
                {data.attempts.map((a: any) => (
                  <li key={a._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{a.volunteerName}</p>
                      <p className="text-sm text-gray-600">{a.message}</p>
                      <p className="text-xs text-gray-500">{fmtDateTime(a.createdAt)} - may be an honest mistake, so check before acting</p>
                    </div>
                    <button onClick={() => markReviewed(a._id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700">Mark reviewed</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={dlg !== null}
        busy={busy}
        danger={dlg === "reject" || dlg === "revoke" || dlg === "rotate"}
        title={dlg ? title[dlg] : ""}
        text={
          dlg === "approve" ? `Approve ${formatMinutes(row?.provisionalMinutes || 0)} for ${row?.volunteerName}? The hours become verified and count toward their certificate.`
          : dlg === "rotate" ? "The old QR code will stop working and a new one is created."
          : dlg === "revoke" ? "Nobody will be able to check in with this QR code until you create a new one."
          : row ? `Volunteer: ${row.volunteerName}` : undefined
        }
        confirmLabel={dlg === "approve" ? "Approve" : dlg === "reject" ? "Reject" : dlg === "revoke" ? "Revoke" : dlg === "rotate" ? "Create new QR" : "Save"}
        onConfirm={submit}
        onCancel={() => setDlg(null)}
      >
        <div className="grid gap-3">
          {dlg === "correct" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-600">Hours<input type="number" min={0} max={16} value={hh} onChange={(e) => setHh(e.target.value)} className={input} /></label>
              <label className="text-sm text-gray-600">Minutes<input type="number" min={0} max={59} value={mm} onChange={(e) => setMm(e.target.value)} className={input} /></label>
            </div>
          )}
          {dlg === "times" && (
            <>
              <label className="text-sm text-gray-600">Check-in<input type="datetime-local" value={inAt} onChange={(e) => setInAt(e.target.value)} className={input} /></label>
              <label className="text-sm text-gray-600">Check-out (leave empty if still there)<input type="datetime-local" value={outAt} onChange={(e) => setOutAt(e.target.value)} className={input} /></label>
            </>
          )}
          {["manual_in", "manual_out", "reject", "correct", "times"].includes(String(dlg)) && (
            <label className="text-sm text-gray-600">Reason (kept in the audit log)<textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={input} /></label>
          )}
          {dlgError && <p role="alert" className="text-sm text-red-600">{dlgError}</p>}
        </div>
      </ConfirmDialog>
    </main>
  );
}