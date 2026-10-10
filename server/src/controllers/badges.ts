import { Response } from "express";
import mongoose from "mongoose";
import { AuthReq } from "../middleware/auth";
import Application from "../models/Application";
import Review from "../models/Review";
import XpTransaction from "../models/XpTransaction";

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

// Monday-aligned week number (UTC), so consecutive weeks differ by exactly 1
function weekIndex(date: Date) {
  return Math.floor((date.getTime() + 3 * DAY) / WEEK);
}

export const badges = async (req: AuthReq, res: Response) => {
  try {
    const volunteerId = new mongoose.Types.ObjectId(String(req.user!.id));

    const [applications, acceptedApps, xpRows, fiveStar, activity] = await Promise.all([
      Application.countDocuments({ volunteer: volunteerId }),
      Application.find({ volunteer: volunteerId, status: "accepted" })
        .populate("opportunity", "date")
        .lean(),
      XpTransaction.aggregate([
        { $match: { volunteer: volunteerId } },
        { $group: { _id: null, total: { $sum: "$points" } } },
      ]),
      Review.countDocuments({
        reviewee: volunteerId,
        direction: "ngo_to_volunteer",
        rating: 5,
      }),
      XpTransaction.find({ volunteer: volunteerId }).select("createdAt").lean(),
    ]);

    const now = Date.now();
    const eventsDone = (acceptedApps as any[]).filter(
      (a) => a.opportunity && new Date(a.opportunity.date).getTime() <= now
    ).length;

    const totalXp = xpRows[0]?.total || 0;
    const level = Math.floor(totalXp / 100) + 1;

    // Weekly streak
    const weeks = new Set<number>(
      (activity as any[]).map((a) => weekIndex(new Date(a.createdAt)))
    );
    const thisWeek = weekIndex(new Date());

    let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - 1;
    let current = 0;
    while (weeks.has(cursor)) {
      current++;
      cursor--;
    }

    const sorted = Array.from(weeks).sort((a, b) => a - b);
    let longest = 0;
    let run = 0;
    let prev = NaN;
    for (const w of sorted) {
      run = w === prev + 1 ? run + 1 : 1;
      if (run > longest) longest = run;
      prev = w;
    }

    const make = (
      code: string,
      title: string,
      description: string,
      value: number,
      target: number
    ) => ({
      code,
      title,
      description,
      earned: value >= target,
      progress: Math.min(value, target),
      target,
    });

    const list = [
      make("first_step", "First Step", "Submit your first application.", applications, 1),
      make("events_5", "5 Events Done", "Take part in 5 finished opportunities.", eventsDone, 5),
      make("events_10", "10 Events Done", "Take part in 10 finished opportunities.", eventsDone, 10),
      make("level_5", "Level 5", "Reach level 5 with your XP.", level, 5),
      make("five_star", "Five-Star Helper", "Get a 5-star review from an NGO.", fiveStar, 1),
      make("streak_3", "3-Week Streak", "Be active 3 weeks in a row.", longest, 3),
    ];

    res.json({
      streak: { current, longest, activeThisWeek: weeks.has(thisWeek) },
      badges: list,
      earnedCount: list.filter((b) => b.earned).length,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load badges" });
  }
};