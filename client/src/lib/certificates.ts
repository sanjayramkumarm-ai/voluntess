export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function formatMinutes(total: number) {
  const h = Math.floor((total || 0) / 60);
  const m = (total || 0) % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

export function formatDay(value?: string | null, long = false) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatIssued(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export async function downloadCertificate(certificateId: string) {
  const token = localStorage.getItem("voluntess_token");
  const res = await fetch(`${API_URL}/certificates/${encodeURIComponent(certificateId)}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Voluntess-Certificate-${certificateId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}