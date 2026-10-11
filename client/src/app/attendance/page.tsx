"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { formatDay, formatMinutes } from "@/lib/certificates";
import { fmtDateTime, stateOf } from "@/lib/attendance";
import { AttendanceBadge, FlagChips } from "@/components/attendance/parts";
import { EmptyState, ErrorState, LoadingState } from "@/components/certificates/ui";

export default function AttendancePage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api("/attendance/my"));
    } catch (err: any) {
      setError(err.message || "Could not load your attendance");
    }
  }, []);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setReady(true);
    if (u?.role === "volunteer") load();
  }, [load]);

  if (!ready) return <LoadingState />;
  if (!user || user.role !== "volunteer") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-700">Attendance is for volunteer accounts.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600">Log in</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My attendance</h1>
          <p className="mt-1 text-gray-600">Check-ins, check-outs and service hours for events you're approved for.</p>
        </div>
        <Link href="/scan" className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Scan to check in</Link>
      </div>

      {error && <div className="mt-6"><ErrorState message={error} onRetry={load} /></div>}
      {!data && !error && <div className="mt-6"><LoadingState /></div>}

      {data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Approved hours</p><p className="mt-1 text-2xl font-extrabold text-green-600">{formatMinutes(data.totals.approvedMinutes)}</p></div>
            <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Waiting for approval</p><p className="mt-1 text-2xl font-extrabold text-amber-600">{formatMinutes(data.totals.pendingMinutes)}</p></div>
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">Upcoming approved events</h2>
            {data.upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No upcoming events waiting for check-in.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {data.upcoming.map((u: any) => (
                  <li key={u.applicationId} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="break-words font-semibold text-gray-900">{u.title}</p>
                    <p className="text-sm text-gray-600">{formatDay(u.date, true)}{u.venue ? ` - ${u.venue}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">Attendance history</h2>
            {data.history.length === 0 ? (
              <div className="mt-3"><EmptyState title="No attendance yet" text="After you scan an event's QR code and check in, it will appear here." /></div>
            ) : (
              <ul className="mt-3 grid gap-3">
                {data.history.map((a: any) => (
                  <li key={a._id} className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-bold text-gray-900">{a.title}</p>
                      <AttendanceBadge state={stateOf(a)} />
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div><dt className="text-gray-500">Checked in</dt><dd className="font-medium text-gray-900">{fmtDateTime(a.checkInAt)}</dd></div>
                      <div><dt className="text-gray-500">Checked out</dt><dd className="font-medium text-gray-900">{a.checkOutAt ? fmtDateTime(a.checkOutAt) : "Not yet"}</dd></div>
                      {a.checkOutAt && <div><dt className="text-gray-500">Recorded time</dt><dd className="font-medium text-gray-900">{formatMinutes(a.provisionalMinutes)}</dd></div>}
                      {a.verification === "approved" && <div><dt className="text-gray-500">Approved hours</dt><dd className="font-medium text-green-700">{formatMinutes(a.approvedMinutes)}</dd></div>}
                    </dl>
                    {a.reviewReason && <p className="mt-2 text-sm text-gray-600">Organiser note: {a.reviewReason}</p>}
                    <div className="mt-2"><FlagChips flags={a.flags} /></div>
                    {a.certificateId && <Link href="/certificates" className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline">View certificate {a.certificateId}</Link>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}