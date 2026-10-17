"use client";

import { usePathname, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";

// Top-level pages that don't need a Back button
const HIDE = ["/", "/explore", "/login", "/dashboard", "/ngo", "/admin", "/map", "/messages", "/reviews", "/quests"];
const HIDE_PREFIX = ["/checkin", "/verify-certificate"];

export default function BackBar() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (HIDE.includes(clean) || HIDE_PREFIX.some((p) => clean.startsWith(p))) return null;

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    const role = getUser()?.role;
    router.push(role === "ngo" ? "/ngo" : role === "admin" ? "/admin" : role === "volunteer" ? "/dashboard" : "/explore");
  }

  return (
    <div className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>
      </div>
    </div>
  );
}