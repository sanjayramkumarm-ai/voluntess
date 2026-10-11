"use client";

const STATE: Record<string, { label: string; cls: string }> = {
  not_attended: { label: "Not attended", cls: "bg-gray-100 text-gray-700" },
  checked_in: { label: "Checked in", cls: "bg-blue-100 text-blue-700" },
  none: { label: "Checked in", cls: "bg-blue-100 text-blue-700" },
  pending: { label: "Hours pending approval", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Hours approved", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Hours rejected", cls: "bg-red-100 text-red-700" },
};

export function AttendanceBadge({ state }: { state: string }) {
  const s = STATE[state] || { label: state, cls: "bg-gray-100 text-gray-700" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

const FLAG: Record<string, string> = {
  exceeds_max: "Over maximum hours",
  short_stay: "Short stay",
  overlap: "Overlaps another record",
  manual_entry: "Manual entry",
  times_corrected: "Times corrected",
};

export function FlagChips({ flags }: { flags?: string[] }) {
  if (!flags || flags.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <span key={f} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{FLAG[f] || f}</span>
      ))}
    </span>
  );
}