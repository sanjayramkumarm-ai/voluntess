"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { photoSrc } from "@/components/ProfilePhoto";

const KEYS = ["voluntess_token", "voluntess_user", "token", "user"];

export default function NgoAccountCard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<{ events: number; volunteers: number; certificates: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [confirmOut, setConfirmOut] = useState(false);

  useEffect(() => {
    setUser(getUser());
    Promise.all([api("/ngo/completion-opportunities"), api("/ngo/certificates")])
      .then(([o, c]: any[]) => {
        const opps = Array.isArray(o) ? o : [];
        const certs = Array.isArray(c) ? c : [];
        setStats({
          events: opps.length,
          volunteers: opps.reduce((s: number, x: any) => s + (x.accepted || 0), 0),
          certificates: certs.filter((x: any) => x.status === "valid").length,
        });
      })
      .catch(() => setStats(null));
  }, []);

  const id = user?.id || user?._id || "";
  const src = photoSrc(user?.profilePhoto);
  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";

  async function copyLink() {
    const link = `${window.location.origin}/ngos/${id}`;
    try {
      await navigator.clipboard.writeText(link);
      setMsg("Public page link copied.");
    } catch {
      setMsg(link);
    }
  }

  function logout() {
    KEYS.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("voluntess-user-updated"));
    window.location.href = "/login";
  }

  const tile = "rounded-xl bg-gray-50 p-4";
  const link = "flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50";

  return (
    <section aria-label="NGO account" className="w-full rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="flex items-center gap-4">
            {src ? (
              <img src={src} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white">
                {(user?.name || "N").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold text-gray-900">{user?.name || "NGO"}</h2>
              <p className="truncate text-sm text-gray-500">{user?.email || ""}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">NGO account</span>
                {user?.verified && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Verified</span>}
              </div>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 text-sm">
            <div className={tile}><dt className="text-gray-500">Organization / Name</dt><dd className="font-semibold text-gray-900">{user?.name || "-"}</dd></div>
            <div className={tile}><dt className="text-gray-500">Account type</dt><dd className="font-semibold capitalize text-gray-900">{user?.role || "ngo"}</dd></div>
            {joined && <div className={tile}><dt className="text-gray-500">Member since</dt><dd className="font-semibold text-gray-900">{joined}</dd></div>}
          </dl>
        </div>

        <div className="min-w-0">
          <div className="grid grid-cols-3 gap-3">
            <div className={tile}><p className="text-xs text-gray-500">Opportunities</p><p className="mt-1 text-2xl font-extrabold text-gray-900">{stats ? stats.events : "-"}</p></div>
            <div className={tile}><p className="text-xs text-gray-500">Approved volunteers</p><p className="mt-1 text-2xl font-extrabold text-gray-900">{stats ? stats.volunteers : "-"}</p></div>
            <div className={tile}><p className="text-xs text-gray-500">Certificates issued</p><p className="mt-1 text-2xl font-extrabold text-blue-600">{stats ? stats.certificates : "-"}</p></div>
          </div>

          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-gray-500">Shortcuts</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Link href="/ngo/profile" className={link}>Edit public profile <span aria-hidden>&rarr;</span></Link>
            <Link href={id ? `/ngos/${id}` : "/ngo"} className={link}>View public page <span aria-hidden>&rarr;</span></Link>
            <Link href="/ngo/attendance" className={link}>Attendance &amp; QR <span aria-hidden>&rarr;</span></Link>
            <Link href="/ngo/completions" className={link}>Completions &amp; certificates <span aria-hidden>&rarr;</span></Link>
            <Link href="/messages" className={link}>Messages <span aria-hidden>&rarr;</span></Link>
            <Link href="/reviews" className={link}>Reviews <span aria-hidden>&rarr;</span></Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={copyLink} disabled={!id} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Copy public page link
            </button>
            {!confirmOut ? (
              <button type="button" onClick={() => setConfirmOut(true)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                Log out
              </button>
            ) : (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-gray-700">Log out of Voluntess?</span>
                <button type="button" onClick={logout} className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white">Yes, log out</button>
                <button type="button" onClick={() => setConfirmOut(false)} className="rounded-lg border border-gray-300 px-3 py-2 font-semibold text-gray-700">Cancel</button>
              </span>
            )}
          </div>
          {msg && <p role="status" className="mt-3 break-all text-sm text-gray-600">{msg}</p>}
        </div>
      </div>
    </section>
  );
}