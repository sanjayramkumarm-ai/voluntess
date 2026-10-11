"use client";

import MessageOrganizerButton from "@/components/MessageOrganizerButton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function Svg({ children, className = "h-4 w-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  calendar: <Svg className="h-5 w-5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>,
  clock: <Svg className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  pin: <Svg className="h-5 w-5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Svg>,
  users: <Svg className="h-5 w-5"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></Svg>,
  link: <Svg><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>,
  whatsapp: <Svg><path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z" /></Svg>,
  addCal: <Svg><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M12 13v6M9 16h6" /></Svg>,
  check: <Svg className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Svg>,
  tick: <Svg className="h-4 w-4"><path d="m5 12 5 5 9-10" /></Svg>,
  arrow: <Svg><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  shield: <Svg><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></Svg>,
  external: <Svg><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Svg>,
};

const CLOSED_STATUSES = ["closed", "full", "completed", "cancelled", "canceled"];

const ACCENTS: Record<string, string> = {
  environment: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30",
  education: "bg-amber-400/15 text-amber-200 ring-amber-300/30",
  health: "bg-rose-400/15 text-rose-200 ring-rose-300/30",
  food: "bg-orange-400/15 text-orange-200 ring-orange-300/30",
  animals: "bg-violet-400/15 text-violet-200 ring-violet-300/30",
  community: "bg-sky-400/15 text-sky-200 ring-sky-300/30",
  default: "bg-blue-400/15 text-blue-200 ring-blue-300/30",
};

function accentFor(category?: string) {
  const c = String(category || "").toLowerCase();
  const key = Object.keys(ACCENTS).find((k) => k !== "default" && c.includes(k));
  return ACCENTS[key || "default"];
}

const pad = (n: number) => String(n).padStart(2, "0");

function parseTime(value?: string) {
  const m = String(value || "").match(/(\d{1,2}):(\d{2})/);
  return m ? { h: Number(m[1]), min: Number(m[2]) } : null;
}

function calendarUrl(o: any) {
  if (!o?.date) return "";
  const base = new Date(o.date);
  if (isNaN(base.getTime())) return "";

  const st = parseTime(o.startTime) || { h: 9, min: 0 };
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), st.h, st.min);
  const et = parseTime(o.endTime);
  const end = et
    ? new Date(base.getFullYear(), base.getMonth(), base.getDate(), et.h, et.min)
    : new Date(start.getTime() + 2 * 3600000);

  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Volunteer: ${o.title || "Opportunity"}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `${o.description || ""}\n\nFound on Voluntess.`,
    location: o.location || "",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function shortDate(value?: string) {
  if (!value) return "Date TBD";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OpportunityDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [opportunity, setOpportunity] = useState<any>(null);
  const [others, setOthers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applyError, setApplyError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadOpportunity = async () => {
      try {
        setLoading(true);
        const data = await api(`/opportunities/${id}`);
        setOpportunity(data);
      } catch (err: any) {
        setError(err.message || "Unable to load opportunity");
      } finally {
        setLoading(false);
      }
    };

    loadOpportunity();

    api("/opportunities")
      .then((data) => setOthers((data?.items || []).filter((o: any) => o._id !== id)))
      .catch(() => {
        // Similar opportunities are optional
      });
  }, [id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  }

  function shareWhatsApp() {
    const text = `${opportunity?.title || "Volunteer opportunity"} - volunteer with ${
      opportunity?.organizer?.name || "an NGO"
    } on Voluntess: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50" role="status" aria-label="Loading">
        <div className="animate-pulse bg-slate-800 px-4 pb-24 pt-10">
          <div className="mx-auto max-w-6xl">
            <div className="h-3 w-48 rounded bg-slate-600" />
            <div className="mt-8 h-6 w-40 rounded bg-slate-600" />
            <div className="mt-4 h-10 w-2/3 rounded bg-slate-600" />
          </div>
        </div>
        <div className="mx-auto -mt-12 grid max-w-6xl animate-pulse gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-gray-200 bg-white" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !opportunity) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-10 text-center">
          <h1 className="text-xl font-bold text-gray-900">Opportunity not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            {error || "This volunteering opportunity may no longer exist."}
          </p>
          <Link href="/explore" className="mt-6 inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black">
            Back to Explore
          </Link>
        </div>
      </main>
    );
  }

  const dateObj = opportunity.date ? new Date(opportunity.date) : null;
  const validDate = Boolean(dateObj && !isNaN(dateObj.getTime()));

  const dateLong = validDate
    ? dateObj!.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "Date not specified";

  const weekday = validDate ? dateObj!.toLocaleDateString("en-IN", { weekday: "long" }) : "";

  const time =
    opportunity.startTime || opportunity.endTime
      ? `${opportunity.startTime || "—"} ${opportunity.endTime ? `- ${opportunity.endTime}` : ""}`
      : "Time not specified";

  const skills = opportunity.skills || [];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayDiff = validDate
    ? Math.round((new Date(dateObj!.getFullYear(), dateObj!.getMonth(), dateObj!.getDate()).getTime() - startOfToday.getTime()) / 86400000)
    : null;
  const isPast = dayDiff !== null && dayDiff < 0;

  const countdown =
    dayDiff === null
      ? ""
      : dayDiff < 0
      ? "Date passed"
      : dayDiff === 0
      ? "Happening today"
      : dayDiff === 1
      ? "Starts tomorrow"
      : `Starts in ${dayDiff} days`;

  const statusText = String(opportunity.status || "Open");
  const isClosed = CLOSED_STATUSES.includes(statusText.toLowerCase());

  const organizerName = opportunity.organizer?.name || "NGO";
  const organizerId = opportunity.organizer?._id;

  const calUrl = calendarUrl(opportunity);
  const mapsUrl = opportunity.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opportunity.location)}`
    : "";

  const similar = [
    ...others.filter((o) => o.category === opportunity.category),
    ...others.filter((o) => o.category !== opportunity.category),
  ].slice(0, 3);

  const handleApply = async () => {
    setApplyError("");
    setApplicationMessage("");

    const token = localStorage.getItem("voluntess_token");
    const savedUser = localStorage.getItem("voluntess_user");

    if (!token || !savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(savedUser);

      if (user?.role !== "volunteer") {
        setApplyError("Only volunteers can apply for opportunities.");
        return;
      }

      setApplying(true);

      await api(`/opportunities/${id}/apply`, {
        method: "POST",
      });

      setApplicationMessage("Application submitted successfully.");
    } catch (err: any) {
      setApplyError(err.message || "Unable to submit application.");
    } finally {
      setApplying(false);
    }
  };

  const applied = !!applicationMessage;

  const applyLabel = applied
    ? "Applied successfully"
    : applying
    ? "Applying..."
    : isClosed
    ? "Applications closed"
    : "Apply now";

  const applyClass = applied
    ? "cursor-default bg-emerald-600"
    : applying
    ? "cursor-wait bg-blue-400"
    : isClosed
    ? "cursor-not-allowed bg-gray-300"
    : "bg-blue-600 shadow-sm shadow-blue-600/30 hover:bg-blue-700";

  const facts = [
    { label: "Date", value: shortDate(opportunity.date), sub: weekday, icon: icons.calendar, tone: "bg-blue-50 text-blue-600" },
    { label: "Time", value: time, sub: "", icon: icons.clock, tone: "bg-indigo-50 text-indigo-600" },
    { label: "Location", value: opportunity.location || "Not specified", sub: "", icon: icons.pin, tone: "bg-rose-50 text-rose-600" },
    { label: "Volunteers needed", value: String(opportunity.capacity ?? "–"), sub: "", icon: icons.users, tone: "bg-emerald-50 text-emerald-600" },
  ];

  const steps = [
    { title: "Apply", text: "Send your application in one click." },
    { title: "NGO reviews", text: "The organizer checks your profile." },
    { title: "Get confirmed", text: "You are notified when approved." },
    { title: "Volunteer", text: "Show up, check in and earn a certificate." },
  ];

  const heroBtn =
    "inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20";

  const ApplyButton = (
    <button
      onClick={handleApply}
      disabled={applying || applied || isClosed}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white transition ${applyClass}`}
    >
      {applied && icons.check}
      {applyLabel}
    </button>
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-28 text-gray-900 lg:pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-28 sm:pt-8">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-300">
            <Link href="/explore" className="hover:text-white">Explore</Link>
            {opportunity.category && (
              <>
                <span className="mx-1 text-slate-500">/</span>
                <Link href={`/explore?category=${encodeURIComponent(opportunity.category)}`} className="hover:text-white">
                  {opportunity.category}
                </Link>
              </>
            )}
          </nav>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {opportunity.category && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${accentFor(opportunity.category)}`}>
                    {opportunity.category}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${isClosed ? "bg-white/10 text-slate-300 ring-white/20" : "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isClosed ? "bg-slate-400" : "bg-emerald-400"}`} />
                  {statusText}
                </span>
                {countdown && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/20">
                    {countdown}
                  </span>
                )}
              </div>

              <h1 className="mt-4 break-words text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {opportunity.title}
              </h1>

              <div className="mt-5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold ring-1 ring-white/25">
                  {organizerName.charAt(0).toUpperCase()}
                </span>
                <div className="text-sm">
                  <p className="text-slate-300">Organized by</p>
                  {organizerId ? (
                    <Link href={"/ngos/" + organizerId} className="font-semibold text-white hover:underline">
                      {organizerName}
                    </Link>
                  ) : (
                    <p className="font-semibold text-white">{organizerName}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={copyLink} className={heroBtn}>
                {icons.link} {copied ? "Link copied" : "Copy link"}
              </button>
              <button type="button" onClick={shareWhatsApp} className={heroBtn}>
                {icons.whatsapp} WhatsApp
              </button>
              {calUrl && (
                <a href={calUrl} target="_blank" rel="noopener noreferrer" className={heroBtn}>
                  {icons.addCal} Add to calendar
                </a>
              )}
              <MessageOrganizerButton />
            </div>
          </div>
        </div>
      </section>

      {/* Key facts */}
      <div className="relative z-10 mx-auto -mt-12 max-w-6xl px-4 sm:px-6">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${f.tone}`}>{f.icon}</span>
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{f.label}</dt>
                <dd className="mt-0.5 break-words text-sm font-semibold text-gray-900">{f.value}</dd>
                {f.sub && <dd className="text-xs text-gray-500">{f.sub}</dd>}
              </div>
            </div>
          ))}
        </dl>
      </div>

      {/* Body */}
      <div className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <span className="h-5 w-1 rounded-full bg-blue-600" />
              About this opportunity
            </h2>
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-gray-700">
              {opportunity.description || "No description provided."}
            </p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <span className="h-5 w-1 rounded-full bg-blue-600" />
              Skills and requirements
            </h2>
            {skills.length > 0 ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {skills.map((skill: string, index: number) => (
                  <li key={`${skill}-${index}`} className="flex items-center gap-2.5 rounded-md bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-800">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">{icons.tick}</span>
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-600">
                No specific skills required. Everyone is welcome to apply.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <span className="h-5 w-1 rounded-full bg-blue-600" />
              How it works
            </h2>
            <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.title} className="relative rounded-md border border-gray-100 bg-gray-50 p-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">{i + 1}</span>
                  <p className="mt-3 text-sm font-semibold">{s.title}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-3 text-lg font-bold">
                <span className="h-5 w-1 rounded-full bg-blue-600" />
                Where and when
              </h2>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Open in Google Maps {icons.external}
                </a>
              )}
            </div>
            <dl className="mt-4 divide-y divide-gray-100 text-sm">
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                <dt className="text-gray-500">Location</dt>
                <dd className="font-semibold">{opportunity.location || "Not specified"}</dd>
              </div>
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                <dt className="text-gray-500">Date</dt>
                <dd className="font-semibold">{dateLong}</dd>
              </div>
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                <dt className="text-gray-500">Time</dt>
                <dd className="font-semibold">{time}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Ready to volunteer?</h2>
                  <p className="mt-1 text-sm text-gray-500">Join and make a difference in your community.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xl font-extrabold tabular-nums">{opportunity.capacity ?? "–"}</p>
                  <p className="text-xs text-gray-500">volunteers needed</p>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-sm font-extrabold leading-7">{countdown || "Date TBD"}</p>
                  <p className="text-xs text-gray-500">{shortDate(opportunity.date)}</p>
                </div>
              </div>

              <div className="mt-5">{ApplyButton}</div>

              {applied && (
                <p className="mt-3 text-center text-sm font-medium text-emerald-700">
                  {applicationMessage}{" "}
                  <Link href="/dashboard" className="underline">Track it on your dashboard</Link>
                </p>
              )}

              {applyError && (
                <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
                  {applyError}
                </p>
              )}

              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <span className="text-gray-400">{icons.shield}</span>
                Free to join. The NGO confirms your spot.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">About the organizer</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900 text-base font-bold text-white">
                {organizerName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{organizerName}</p>
                <p className="text-xs text-gray-500">NGO organizer</p>
              </div>
            </div>
            {organizerId && (
              <Link
                href={"/ngos/" + organizerId}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View NGO profile {icons.arrow}
              </Link>
            )}
          </section>

          {similar.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white p-2">
              <h2 className="px-4 pb-1 pt-4 text-sm font-semibold uppercase tracking-wide text-gray-500">More opportunities</h2>
              <ul>
                {similar.map((o) => (
                  <li key={o._id}>
                    <Link href={`/opportunities/${o._id}`} className="block rounded-md px-4 py-3 hover:bg-gray-50">
                      <p className="truncate text-sm font-semibold text-gray-900">{o.title}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {shortDate(o.date)}
                        {o.location ? ` · ${o.location}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/explore" className="block px-4 pb-3 pt-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
                Browse all opportunities
              </Link>
            </section>
          )}
        </aside>
      </div>

      {/* Mobile apply bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
        {applyError && (
          <p role="alert" className="mb-2 text-center text-xs font-medium text-red-700">{applyError}</p>
        )}
        {ApplyButton}
      </div>
    </main>
  );
}