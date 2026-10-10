"use client";

import { useEffect, useState } from "react";
import { downloadCertificate } from "@/lib/certificates";

const STATUS: Record<string, { label: string; cls: string }> = {
  valid: { label: "Verified", cls: "bg-green-100 text-green-700" },
  revoked: { label: "Revoked", cls: "bg-red-100 text-red-700" },
  accepted: { label: "Accepted", cls: "bg-gray-100 text-gray-700" },
  attendance_recorded: { label: "Attendance recorded", cls: "bg-blue-100 text-blue-700" },
  completion_pending: { label: "Completion pending", cls: "bg-amber-100 text-amber-700" },
  verified: { label: "Completed and verified", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Completion rejected", cls: "bg-red-100 text-red-700" },
};

export function VerificationStatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || { label: status, cls: "bg-gray-100 text-gray-700" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" className="rounded-2xl bg-white p-10 text-center text-gray-500 shadow-sm">
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-gray-500">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function ConfirmDialog({
  open, title, text, confirmLabel, danger, busy, onConfirm, onCancel, children,
}: {
  open: boolean; title: string; text?: string; confirmLabel: string; danger?: boolean; busy?: boolean;
  onConfirm: () => void; onCancel: () => void; children?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CertificateDownloadButton({
  certificateId, label = "Download PDF", className = "",
}: { certificateId: string; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    try {
      await downloadCertificate(certificateId);
    } catch (err: any) {
      setError(err.message || "Download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        onClick={go}
        disabled={busy}
        className={`rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 ${className}`}
      >
        {busy ? "Preparing..." : label}
      </button>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </span>
  );
}