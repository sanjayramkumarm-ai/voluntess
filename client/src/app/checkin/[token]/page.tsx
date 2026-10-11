"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, getUser } from "@/lib/api";
import { formatDay, formatMinutes } from "@/lib/certificates";
import { fmtDateTime, stateOf } from "@/lib/attendance";
import { AttendanceBadge } from "@/components/attendance/parts";
import { LoadingState } from "@/components/certificates/ui";

export default function CheckinPage() {
  const params: any = useParams();
  const raw = params?.token;
  const token = String(Array.isArray(raw) ? raw[0] : raw || "");

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api(`/checkin/${token}`));
    } catch (err: any) {
      setData(null);
      setError(err.message || "Could not load this check-in");
    }
  }, [token]);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setReady(true);
    if (u && token) load();
  }, [token, load]);

  async function act(kind: "check-in" | "check-out") {
    setBusy(true);
    setNotice(null);
    try {
      const res: any = await api(`/checkin/${token}/${kind}`, { method: "POST" });
      setNotice({ ok: true, text: res.message });
      setData((d: any) => ({ ...d, attendance: res.attendance }));
    } catch (err: any) {
      setNotice({ ok: false, text: err.message || "Something went wrong" });
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <LoadingState />;

  const shell = "mx-auto max-w-lg px-4 py-10";

  if (!user) {
    return (
      <main className={shell}>
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold text-gray-900">Event check-in</h1>
          <p className="mt-2 text-gray-600">Log in with your volunteer account, then scan the QR code again to check in.</p>
          <Link href="/login" className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">Log in</Link>
        </div>
      </main>
    );
  }

  const att = data?.attendance;
  const state = att ? stateOf(att) : "";

  return (
    <main className={shell}>
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold text-gray-900">Event check-in</h1>

        {!data && !error && <p role="status" className="mt-6 text-gray-500">Checking your QR code...</p>}

        {error && (
          <div role="alert" className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
            <p className="font-semibold">{error}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
              <Link href="/scan" className="text-blue-600">Scan again</Link>
              <Link href="/attendance" className="text-blue-600">My attendance</Link>
            </div>
          </div>
        )}

        {data && (
          <>
            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <p className="break-words text-lg font-bold text-gray-900">{data.event.title}</p>
              {data.event.ngoName && <p className="text-sm text-gray-600">by {data.event.ngoName}</p>}
              <p className="mt-2 text-sm text-gray-700">{formatDay(data.event.date, true)}</p>
              {data.event.venue && <p className="text-sm text-gray-700">{data.event.venue}</p>}
            </div>

            {att && (
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-gray-500">Checked in</dt><dd className="font-semibold text-gray-900">{fmtDateTime(att.checkInAt)}</dd></div>
                <div><dt className="text-gray-500">Checked out</dt><dd className="font-semibold text-gray-900">{att.checkOutAt ? fmtDateTime(att.checkOutAt) : "Not yet"}</dd></div>
                {att.checkOutAt && <div><dt className="text-gray-500">Time recorded</dt><dd className="font-semibold text-gray-900">{formatMinutes(att.provisionalMinutes)}</dd></div>}
                <div><dt className="text-gray-500">Status</dt><dd><AttendanceBadge state={state} /></dd></div>
              </dl>
            )}

            {notice && (
              <p role={notice.ok ? "status" : "alert"} className={`mt-5 rounded-xl p-3 text-sm font-semibold ${notice.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {notice.text}
              </p>
            )}

            <div className="mt-6">
              {!att && !data.windowOpen && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Check-in is only open around the event date.</p>
              )}
              {!att && data.windowOpen && (
                <button onClick={() => act("check-in")} disabled={busy} className="w-full rounded-xl bg-blue-600 px-5 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                  {busy ? "Checking in..." : "Check in"}
                </button>
              )}
              {att && !att.checkOutAt && (
                <button onClick={() => act("check-out")} disabled={busy} className="w-full rounded-xl bg-gray-900 px-5 py-4 text-lg font-bold text-white hover:bg-black disabled:opacity-60">
                  {busy ? "Checking out..." : "Check out"}
                </button>
              )}
              {att && att.checkOutAt && (
                <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">All done. The organiser will review your hours, and you'll get a notification.</p>
              )}
            </div>

            <p className="mt-6 text-center text-sm"><Link href="/attendance" className="font-semibold text-blue-600 hover:underline">My attendance</Link></p>
          </>
        )}
      </div>
    </main>
  );
}