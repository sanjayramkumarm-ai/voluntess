import Quest from "../models/Quest";
import QuestProgress from "../models/QuestProgress";
import XpTransaction from "../models/XpTransaction";

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

function getPeriodKey(period: string): string {
  const now = new Date();

  if (period === "daily") {
    return now.toISOString().slice(0, 10);
  }

  const date = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));

  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);

  const year = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `${year}-W${String(week).padStart(2, "0")}`;
}

async function awardXpOnce(
  volunteerId: string,
  sourceType: "application" | "quest" | "verified_activity",
  sourceId: string,
  points: number,
  description: string
): Promise<boolean> {
  const result = await XpTransaction.updateOne(
    { volunteer: volunteerId, sourceType, sourceId },
    {
      $setOnInsert: {
        volunteer: volunteerId,
        sourceType,
        sourceId,
        points,
        description
      }
    },
    { upsert: true }
  );

  return result.upsertedCount === 1;
}

export async function recordQuestEvent(
  volunteerId: string,
  action: "apply_opportunity" | "accepted_application",
  eventId: string
): Promise<void> {
  for (const quest of defaultQuests) {
    await Quest.updateOne(
      { code: quest.code },
      { $setOnInsert: quest },
      { upsert: true }
    );
  }

  // Award base XP only once for this event.
  if (action === "apply_opportunity") {
    await awardXpOnce(
      volunteerId,
      "application",
      eventId,
      5,
      "Submitted a volunteering application"
    );
  }

  const quests = await Quest.find({
    active: true,
    action
  });

  for (const quest of quests) {
    const periodKey = getPeriodKey(quest.period);
    const identity = {
      volunteer: volunteerId,
      quest: quest._id,
      periodKey
    };

    await QuestProgress.findOneAndUpdate(
      identity,
      {
        $setOnInsert: {
          ...identity,
          progress: 0,
          completed: false,
          rewardClaimed: false
        }
      },
      { upsert: true, new: true }
    );

    // Atomically increase progress without exceeding the target.
    await QuestProgress.findOneAndUpdate(
      { ...identity, progress: { $lt: quest.target } },
      { $inc: { progress: 1 } },
      { new: true }
    );

    const progress = await QuestProgress.findOne(identity);

    if (!progress || progress.progress < quest.target) {
      continue;
    }

    if (!progress.completed) {
      progress.completed = true;
      progress.completedAt = new Date();
      await progress.save();
    }

    // The unique XP transaction index prevents duplicate quest rewards.
    const awarded = await awardXpOnce(
      volunteerId,
      "quest",
      `${String(quest._id)}:${periodKey}`,
      quest.rewardXp,
      `Completed quest: ${quest.title}`
    );

    if (awarded && !progress.rewardClaimed) {
      progress.rewardClaimed = true;
      await progress.save();
    } else if (!awarded && !progress.rewardClaimed) {
      // A previous attempt may have saved the reward before updating progress.
      progress.rewardClaimed = true;
      await progress.save();
    }
  }
}
