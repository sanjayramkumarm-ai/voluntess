import { Response } from "express";
import { AuthReq } from "../middleware/auth";
import Quest from "../models/Quest";
import QuestProgress from "../models/QuestProgress";
import XpTransaction from "../models/XpTransaction";
import User from "../models/User";

const defaultQuests = [
  {
    code: "daily_first_application",
    title: "Take the First Step",
    description: "Submit one volunteering application today.",
    period: "daily",
    action: "apply_opportunity",
    target: 1,
    rewardXp: 10,
    active: true
  },
  {
    code: "weekly_three_applications",
    title: "Opportunity Explorer",
    description: "Submit three volunteering applications this week.",
    period: "weekly",
    action: "apply_opportunity",
    target: 3,
    rewardXp: 30,
    active: true
  },
  {
    code: "weekly_first_acceptance",
    title: "Ready to Make a Difference",
    description: "Get one volunteering application accepted this week.",
    period: "weekly",
    action: "accepted_application",
    target: 1,
    rewardXp: 50,
    active: true
  }
];

async function ensureDefaultQuests() {
  for (const quest of defaultQuests) {
    await Quest.updateOne(
      { code: quest.code },
      { $setOnInsert: quest },
      { upsert: true }
    );
  }
}

function getPeriodKey(period: string) {
  const now = new Date();
  const year = now.getUTCFullYear();

  if (period === "daily") {
    return now.toISOString().slice(0, 10);
  }

  const date = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);

  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(
    (((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7
  );

  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

export const mine = async (req: AuthReq, res: Response) => {
  await ensureDefaultQuests();

  const volunteerId = req.user!.id;
  const quests = await Quest.find({ active: true }).sort({ period: 1, title: 1 });

  const result = await Promise.all(
    quests.map(async (quest) => {
      const periodKey = getPeriodKey(quest.period);

      let progress = await QuestProgress.findOne({
        volunteer: volunteerId,
        quest: quest._id,
        periodKey
      });

      if (!progress) {
        progress = await QuestProgress.findOneAndUpdate(
          {
            volunteer: volunteerId,
            quest: quest._id,
            periodKey
          },
          {
            $setOnInsert: {
              volunteer: volunteerId,
              quest: quest._id,
              periodKey,
              progress: 0,
              completed: false,
              rewardClaimed: false
            }
          },
          { upsert: true, new: true }
        );
      }

      return {
        id: quest._id,
        code: quest.code,
        title: quest.title,
        description: quest.description,
        period: quest.period,
        action: quest.action,
        target: quest.target,
        rewardXp: quest.rewardXp,
        progress: progress?.progress || 0,
        completed: progress?.completed || false,
        rewardClaimed: progress?.rewardClaimed || false,
        periodKey
      };
    })
  );

  const xp = await XpTransaction.aggregate([
    { $match: { volunteer: (await User.findById(volunteerId))?._id } },
    { $group: { _id: null, total: { $sum: "$points" } } }
  ]);

  const totalXp = xp[0]?.total || 0;
  const level = Math.floor(totalXp / 100) + 1;

  res.json({
    totalXp,
    level,
    xpToNextLevel: level * 100 - totalXp,
    quests: result
  });
};

export const leaderboard = async (_req: AuthReq, res: Response) => {
  const rankings = await XpTransaction.aggregate([
    {
      $group: {
        _id: "$volunteer",
        totalXp: { $sum: "$points" }
      }
    },
    { $sort: { totalXp: -1, _id: 1 } },
    { $limit: 50 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        volunteerId: "$_id",
        name: "$user.name",
        totalXp: 1,
        level: {
          $add: [
            { $floor: { $divide: ["$totalXp", 100] } },
            1
          ]
        }
      }
    }
  ]);

  res.json(rankings);
};
