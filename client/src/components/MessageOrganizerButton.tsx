"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getUser } from "@/lib/api";

export default function MessageOrganizerButton() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setUser(getUser());
  }, []);

  const raw: any = (params as any)?.id;
  const id = String(Array.isArray(raw) ? raw[0] : raw || "");

  if (!user || user.role !== "volunteer" || !id) return null;

  async function open() {
    setBusy(true);
    setError("");
    try {
      const r = await api(`/opportunities/${id}/conversation`, { method: "POST" });
      router.push(`/messages?open=${r._id}`);
    } catch (err: any) {
      setError(err.message || "Could not open the chat");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={open}
        disabled={busy}
        title="Message the organizer"
        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {busy ? "Opening..." : "Message organizer"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}