"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Badge = {
  code: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number;
  target: number;
};

type BadgeData = {
  streak: { current: number; longest: number; activeThisWeek: boolean };
  badges: Badge[];
  earnedCount: number;
};

const SYMBOLS: Record<string, string> = {
  first_step: "1st",
  events_5: "5",
  events_10: "10",
  level_5: "Lv5",
  five_star: "5*",
  streak_3: "3w",
};

export default function BadgeShelf() {
  const [data, setData] = useState<BadgeData | null>(null);

  useEffect(() => {
    api("/quests/badges")
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  const { streak, badges, earnedCount } = data;

  return (
    <section className="mt-7 sm:mt-10 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-amber-600">
            Your achievements
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Badges</h2>
          <p className="mt-1 text-sm text-slate-500">
            {earnedCount} of {badges.length} earned
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 px-5 py-3 text-center">
          <p className="text-3xl font-extrabold text-amber-700">{streak.current}</p>
          <p className="text-xs font-semibold text-amber-700">
            week{streak.current === 1 ? "" : "s"} streak
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Best: {streak.longest}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {streak.activeThisWeek
          ? "You're active this week. Your streak is safe."
          : streak.current > 0
          ? "Do one action this week to keep your streak alive."
          : "Apply to an opportunity to start your streak."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {badges.map((badge) => (
          <div
            key={badge.code}
            className={`rounded-2xl border p-4 text-center ${
              badge.earned ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"
            }`}
          >
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-base font-extrabold ${
                badge.earned ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {SYMBOLS[badge.code] || "*"}
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">{badge.title}</p>
            <p className="mt-1 text-xs text-slate-500">{badge.description}</p>
            <p
              className={`mt-2 text-xs font-semibold ${
                badge.earned ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              {badge.earned ? "Earned" : `${badge.progress}/${badge.target}`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}