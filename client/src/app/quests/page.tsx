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

export default function QuestsPage() {
  const router = useRouter();
  const [data, setData] = useState<QuestData | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading your Quest journey...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Quest unavailable</h1>
          <p className="mt-3 text-slate-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
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

  function QuestCard({ quest }: { quest: Quest }) {
    const percentage = Math.min(100, (quest.progress / quest.target) * 100);

    return (
      <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{quest.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {quest.description}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">
            +{quest.rewardXp} XP
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">Your progress</span>
          <span className="font-bold text-slate-900">
            {Math.min(quest.progress, quest.target)} / {quest.target}
          </span>
        </div>

        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`${quest.title} progress`}
          aria-valuemin={0}
          aria-valuemax={quest.target}
          aria-valuenow={Math.min(quest.progress, quest.target)}
        >
          <div
            className={`h-full rounded-full transition-all ${
              quest.completed ? "bg-emerald-500" : "bg-indigo-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className={`mt-4 text-sm font-semibold ${
          quest.completed ? "text-emerald-700" : "text-slate-500"
        }`}>
          {quest.completed
            ? "? Quest completed"
            : `${Math.max(0, quest.target - quest.progress)} more action(s) to go`}
        </p>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-8 sm:py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          ? Back to dashboard
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600 rounded-2xl p-4 text-white shadow-lg sm:rounded-3xl sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">
            Voluntess Quest
          </p>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:mt-3 sm:text-4xl">
            Every action makes a difference.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:mt-3 sm:text-base sm:leading-7">
            Complete volunteering missions, earn XP, level up, and celebrate
            the impact you make in your community.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 rounded-xl p-2 sm:rounded-2xl sm:p-5">
              <p className="text-xs text-blue-100 sm:text-sm">Total XP</p>
              <p className="mt-1 text-xl font-extrabold sm:mt-2 sm:text-3xl">{data.totalXp}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 rounded-xl p-2 sm:rounded-2xl sm:p-5">
              <p className="text-xs text-blue-100 sm:text-sm">Current level</p>
              <p className="mt-1 text-xl font-extrabold sm:mt-2 sm:text-3xl">{data.level}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 rounded-xl p-2 sm:rounded-2xl sm:p-5">
              <p className="text-xs text-blue-100 sm:text-sm">Quests completed</p>
              <p className="mt-1 text-xl font-extrabold sm:mt-2 sm:text-3xl">
                {data.quests.filter((quest) => quest.completed).length}
              </p>
            </div>
          </div>

          <div className="mt-7">
            <div className="flex justify-between text-xs text-blue-100 sm:text-sm">
              <span>Progress to level {data.level + 1}</span>
              <span>{progressToLevel}/100 XP</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progressToLevel}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-blue-100">
              {data.xpToNextLevel} XP to your next level
            </p>
          </div>
        </section>

        <BadgeShelf />

        <section className="mt-7 sm:mt-10">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
              Start today
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
              Daily quests
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {daily.map((quest) => <QuestCard key={quest.id} quest={quest} />)}
            {daily.length === 0 && (
              <p className="text-slate-500">No daily quests available right now.</p>
            )}
          </div>
        </section>

        <section className="mt-7 sm:mt-10">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-wider text-cyan-700">
              Build your streak
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
              Weekly quests
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {weekly.map((quest) => <QuestCard key={quest.id} quest={quest} />)}
            {weekly.length === 0 && (
              <p className="text-slate-500">No weekly quests available right now.</p>
            )}
          </div>
        </section>

        <section className="mt-7 sm:mt-10 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-amber-600">
            Community champions
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
            Volunteer leaderboard
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Rankings are based on XP earned through recorded activities.
          </p>

          {leaders.length === 0 ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">
              The leaderboard is waiting for its first XP earners. Be one of them!
            </p>
          ) : (
            <div className="mt-6 divide-y divide-slate-100">
              {leaders.map((leader, index) => (
                <div
                  key={leader.volunteerId}
                  className="flex items-center gap-4 py-4"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-extrabold ${
                    index === 0
                      ? "bg-amber-100 text-amber-700"
                      : index === 1
                      ? "bg-slate-200 text-slate-700"
                      : index === 2
                      ? "bg-orange-100 text-orange-700"
                      : "bg-indigo-50 text-indigo-700"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{leader.name}</p>
                    <p className="text-sm text-slate-500">Level {leader.level}</p>
                  </div>
                  <p className="shrink-0 font-extrabold text-indigo-700">
                    {leader.totalXp} XP
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/explore"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700"
          >
            Explore opportunities
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-100"
          >
            My dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}


