"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getUser } from "@/lib/api";
import BadgeShelf from "@/components/BadgeShelf";

type Quest = {
  id: string;
  code: string;
  title: string;
  description: string;
  period: "daily" | "weekly";
  target: number;
  rewardXp: number;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
};

type Leader = {
  volunteerId: string;
  name: string;
  totalXp: number;
  level: number;
};

type QuestData = {
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  quests: Quest[];
};

function Svg({ children, className = "h-4 w-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  back: <Svg><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>,
  compass: <Svg><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>,
  bolt: <Svg className="h-5 w-5"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Svg>,
  level: <Svg className="h-5 w-5"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></Svg>,
  check: <Svg className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Svg>,
  trophy: <Svg className="h-5 w-5"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></Svg>,
  tick: <Svg className="h-3.5 w-3.5"><path d="m5 12 5 5 9-10" /></Svg>,
};

function statusOf(q: Quest) {
  if (q.completed) return "done";
  if (q.progress > 0) return "progress";
  return "new";
}

const STATUS_STYLE: Record<string, { label: string; badge: string }> = {
  done: { label: "Completed", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  progress: { label: "In progress", badge: "bg-blue-50 text-blue-700 ring-blue-200" },
  new: { label: "Not started", badge: "bg-gray-100 text-gray-600 ring-gray-200" },
};

function QuestRow({ quest }: { quest: Quest }) {
  const shown = Math.min(quest.progress, quest.target);
  const pct = quest.target > 0 ? Math.min(100, (shown / quest.target) * 100) : 0;
  const st = STATUS_STYLE[statusOf(quest)];
  const left = Math.max(0, quest.target - quest.progress);

  return (
    <article className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold text-gray-900">{quest.title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-600">{quest.description}</p>
        </div>
        <span className="shrink-0 rounded-md bg-gray-900 px-2 py-1 text-xs font-bold tabular-nums text-white">
          +{quest.rewardXp} XP
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${st.badge}`}>
          {quest.completed && icons.tick}
          {st.label}
        </span>
        <span className="font-semibold tabular-nums text-gray-700">
          {shown} / {quest.target}
        </span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-label={`${quest.title} progress`}
        aria-valuemin={0}
        aria-valuemax={quest.target}
        aria-valuenow={shown}
      >
        <div
          className={`h-full rounded-full transition-all ${quest.completed ? "bg-emerald-500" : "bg-blue-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {quest.completed ? "Reward earned." : `${left} more action${left === 1 ? "" : "s"} to go`}
      </p>
    </article>
  );
}

export default function QuestsPage() {
  const router = useRouter();
  const [data, setData] = useState<QuestData | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState("");

  useEffect(() => {
    const user = getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "volunteer") {
      router.replace(user.role === "ngo" ? "/ngo" : "/admin");
      return;
    }

    setMyId(String(user._id || user.id || ""));

    async function load() {
      try {
        const [questData, leaderboardData] = await Promise.all([
          api("/quests/mine"),
          api("/quests/leaderboard")
        ]);

        setData(questData);
        setLeaders(Array.isArray(leaderboardData) ? leaderboardData : []);
      } catch (err: any) {
        setError(err.message || "Could not load your quests.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8" role="status" aria-label="Loading">
        <div className="mx-auto max-w-7xl animate-pulse space-y-4">
          <div className="h-6 w-56 rounded bg-gray-200" />
          <div className="h-32 rounded-lg border border-gray-200 bg-white" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">Quest unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const daily = data.quests.filter((quest) => quest.period === "daily");
  const weekly = data.quests.filter((quest) => quest.period === "weekly");
  const progressToLevel = data.totalXp % 100;
  const completedCount = data.quests.filter((quest) => quest.completed).length;

  const myIndex = myId ? leaders.findIndex((l) => String(l.volunteerId) === myId) : -1;
  const myRank = myIndex >= 0 ? `#${myIndex + 1}` : "-";

  const stats = [
    { label: "Total XP", value: String(data.totalXp), note: "Earned from activities", icon: icons.bolt, tone: "bg-amber-50 text-amber-600" },
    { label: "Current level", value: String(data.level), note: `${data.xpToNextLevel} XP to next level`, icon: icons.level, tone: "bg-indigo-50 text-indigo-600" },
    { label: "Quests completed", value: `${completedCount}`, note: `of ${data.quests.length} available`, icon: icons.check, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Leaderboard rank", value: myRank, note: myIndex >= 0 ? `of ${leaders.length} volunteers` : "Earn XP to appear", icon: icons.trophy, tone: "bg-blue-50 text-blue-600" },
  ];

  const sections = [
    { key: "daily", title: "Daily quests", sub: "Reset every day", items: daily, empty: "No daily quests available right now." },
    { key: "weekly", title: "Weekly quests", sub: "Reset every week", items: weekly, empty: "No weekly quests available right now." },
  ];

  const rankStyle = (i: number) =>
    i === 0
      ? "bg-amber-100 text-amber-700"
      : i === 1
      ? "bg-gray-200 text-gray-700"
      : i === 2
      ? "bg-orange-100 text-orange-700"
      : "bg-gray-100 text-gray-600";

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-gray-500">
              <Link href="/dashboard" className="hover:text-gray-800">Dashboard</Link>
              <span className="mx-1 text-gray-300">/</span>
              Quest
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Voluntess Quest</h1>
            <p className="mt-1 text-sm text-gray-500">Complete missions, earn XP and level up as you volunteer.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {icons.back} Dashboard
            </Link>
            <Link href="/explore" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {icons.compass} Explore opportunities
            </Link>
          </div>
        </div>

        {/* Level progress */}
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-gray-900 text-white">
              <span className="text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-300">Level</span>
              <span className="text-xl font-extrabold leading-none tabular-nums">{data.level}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                <p className="font-semibold">Progress to level {data.level + 1}</p>
                <p className="tabular-nums text-gray-500">{progressToLevel} / 100 XP</p>
              </div>
              <div
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-label="Progress to next level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressToLevel}
              >
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all" style={{ width: `${progressToLevel}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">{data.xpToNextLevel} XP to your next level</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="Quest summary" className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-3 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-4 text-gray-500 sm:text-sm">{s.label}</p>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-9 sm:w-9 ${s.tone}`}>{s.icon}</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:mt-3 sm:text-3xl">{s.value}</p>
              <p className="mt-0.5 truncate text-[11px] text-gray-500 sm:mt-1 sm:text-xs">{s.note}</p>
            </div>
          ))}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main */}
          <div className="min-w-0 space-y-4">
            <BadgeShelf />

            {sections.map((sec) => (
              <section key={sec.key} className="rounded-lg border border-gray-200 bg-white">
                <div className="flex items-baseline justify-between border-b border-gray-200 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold">{sec.title}</h2>
                    <p className="text-xs text-gray-500">{sec.sub}</p>
                  </div>
                  <p className="text-xs tabular-nums text-gray-500">
                    {sec.items.filter((q) => q.completed).length} of {sec.items.length} done
                  </p>
                </div>

                {sec.items.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-gray-500">{sec.empty}</p>
                ) : (
                  <div className="grid gap-3 bg-gray-50/60 p-4 md:grid-cols-2">
                    {sec.items.map((quest) => (
                      <QuestRow key={quest.id} quest={quest} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Leaderboard */}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold">Volunteer leaderboard</h2>
                <p className="text-xs text-gray-500">Ranked by XP from recorded activities.</p>
              </div>

              {leaders.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-500">
                  The leaderboard is waiting for its first XP earners. Be one of them!
                </p>
              ) : (
                <ol className="divide-y divide-gray-100">
                  {leaders.map((leader, index) => {
                    const me = myId && String(leader.volunteerId) === myId;
                    return (
                      <li
                        key={leader.volunteerId}
                        className={`flex items-center gap-3 px-5 py-3 ${me ? "bg-blue-50/60" : ""}`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${rankStyle(index)}`}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {leader.name}
                            {me && (
                              <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">You</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">Level {leader.level}</p>
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-gray-900">
                          {leader.totalXp} <span className="text-xs font-medium text-gray-500">XP</span>
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}