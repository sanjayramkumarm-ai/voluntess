import { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { z } from "zod";
import Team from "../models/Team";
import Application from "../models/Application";
import Opportunity from "../models/Opportunity";
import Notification from "../models/Notification";
import { recordQuestEvent } from "./questRewards";

const MAX_MEMBERS = 20;
const MAX_LED_TEAMS = 5;

function me(req: Request) {
  const u = (req as any).user;
  return { id: String(u?.id || u?._id || ""), role: String(u?.role || "") };
}

function volunteerOnly(req: Request, res: Response) {
  const user = me(req);
  if (user.role !== "volunteer") {
    res.status(403).json({ message: "Only volunteer accounts can use teams" });
    return null;
  }
  return user;
}

function newCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export const createTeam = async (req: Request, res: Response) => {
  try {
    const user = volunteerOnly(req, res);
    if (!user) return;

    const parsed = z
      .object({ name: z.string().trim().min(2, "Team name is too short").max(60, "Team name is too long") })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid input" });
    }

    if ((await Team.countDocuments({ leader: user.id })) >= MAX_LED_TEAMS) {
      return res.status(400).json({ message: `You can lead up to ${MAX_LED_TEAMS} teams` });
    }

    for (let i = 0; i < 5; i++) {
      try {
        const team = await Team.create({
          name: parsed.data.name,
          leader: user.id,
          members: [user.id],
          inviteCode: newCode(),
        });
        return res.status(201).json({ _id: team._id });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
      }
    }
    res.status(500).json({ message: "Could not create team, please try again" });
  } catch (error) {
    res.status(500).json({ message: "Could not create team" });
  }
};

export const myTeams = async (req: Request, res: Response) => {
  try {
    const user = volunteerOnly(req, res);
    if (!user) return;

    const teams: any[] = await Team.find({ members: user.id })
      .populate("members", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      teams.map((t) => {
        const isLeader = String(t.leader) === user.id;
        return {
          _id: t._id,
          name: t.name,
          isLeader,
          leaderId: String(t.leader),
          inviteCode: isLeader ? t.inviteCode : undefined,
          members: (t.members || []).map((m: any) => ({ _id: m._id, name: m.name || "Volunteer" })),
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: "Could not load teams" });
  }
};

export const joinTeam = async (req: Request, res: Response) => {
  try {
    const user = volunteerOnly(req, res);
    if (!user) return;

    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!/^[A-F0-9]{8}$/.test(code)) {
      return res.status(400).json({ message: "Enter the 8-character invite code" });
    }

    const team: any = await Team.findOne({ inviteCode: code });
    if (!team) return res.status(404).json({ message: "No team found for that code" });

    if (team.members.some((m: any) => String(m) === user.id)) {
      return res.status(400).json({ message: "You are already in this team" });
    }

    const updated: any = await Team.findOneAndUpdate(
      { _id: team._id, members: { $ne: user.id }, $expr: { $lt: [{ $size: "$members" }, MAX_MEMBERS] } },
      { $addToSet: { members: user.id } },
      { new: true }
    );
    if (!updated) return res.status(400).json({ message: "This team is full" });

    try {
      await Notification.create({
        recipient: team.leader,
        type: "team_member_joined",
        title: "New Team Member",
        message: `A volunteer joined your team "${team.name}".`,
      });
    } catch (error) {
      console.error("Team join notification failed:", error);
    }

    res.json({ _id: updated._id, name: updated.name });
  } catch (error) {
    res.status(500).json({ message: "Could not join team" });
  }
};

export const leaveTeam = async (req: Request, res: Response) => {
  try {
    const user = volunteerOnly(req, res);
    if (!user) return;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Team not found" });

    const team: any = await Team.findOne({ _id: req.params.id, members: user.id });
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (String(team.leader) === user.id) {
      return res.status(400).json({ message: "Leaders can't leave. Disband the team instead." });
    }

    await Team.updateOne({ _id: team._id }, { $pull: { members: user.id } });
    res.json({ message: "You left the team" });
  } catch (error) {
    res.status(500).json({ message: "Could not leave team" });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const user = volunteerOnly(req, res);
    if (!user) return;
    const { id, userId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ message: "Team not found" });
    }

    const team: any = await Team.findOne({ _id: id, leader: user.id });
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (userId === user.id) return res.status(400).json({ message: "You can't remove yourself" });

    await Team.updateOne({ _id: team._id }, { $pull: { members: userId } });
    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ message: "Could not remove member" });
  }
};

export const disbandTeam = async (req: Request, res: Response) => {
  try {
    const user = volunteerOnly(req, res);
    if (!user) return;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Team not found" });

    const result = await Team.deleteOne({ _id: req.params.id, leader: user.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Team not found" });
    res.json({ message: "Team disbanded" });
  } catch (error) {
    res.status(500).json({ message: "Could not disband team" });
  }
};

// Leader applies for every member at once
export const teamApply = async (req: Request, res: Response) => {
  try {
    const user = volunteerOnly(req, res);
    if (!user) return;

    const parsed = z
      .object({
        opportunityId: z.string(),
        message: z.string().trim().max(300, "Message must be 300 characters or less").optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid input" });
    }
    const { opportunityId, message } = parsed.data;

    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(opportunityId)) {
      return res.status(404).json({ message: "Team or opportunity not found" });
    }

    const team: any = await Team.findOne({ _id: req.params.id, leader: user.id });
    if (!team) return res.status(403).json({ message: "Only the team leader can apply for the team" });

    const opportunity: any = await Opportunity.findById(opportunityId);
    if (!opportunity) return res.status(404).json({ message: "Opportunity not found" });
    if (opportunity.status !== "open") {
      return res.status(400).json({ message: "This opportunity is not open" });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (new Date(opportunity.date) < startOfToday) {
      return res.status(400).json({ message: "This opportunity has already happened" });
    }

    const members: string[] = team.members.map((m: any) => String(m));
    const existing: any[] = await Application.find({
      opportunity: opportunity._id,
      volunteer: { $in: members },
    });
    const existingMap = new Map<string, any>(existing.map((a) => [String(a.volunteer), a] as [string, any]));

    const eligible = members.filter((m) => {
      const a = existingMap.get(m);
      return !a || a.status === "withdrawn";
    });
    if (eligible.length === 0) {
      return res.status(400).json({ message: "Every member already has an application for this opportunity" });
    }

    const accepted = await Application.countDocuments({ opportunity: opportunity._id, status: "accepted" });
    const spotsLeft = (opportunity.capacity || 1) - accepted;
    if (eligible.length > spotsLeft) {
      return res.status(400).json({
        message: `Only ${Math.max(0, spotsLeft)} spot(s) left, but ${eligible.length} team member(s) would apply`,
      });
    }

    const text = `[Team: ${team.name}]${message ? " " + message : ""}`;
    let applied = 0;

    for (const memberId of eligible) {
      const old = existingMap.get(memberId);
      if (old) {
        old.status = "pending";
        old.team = team._id;
        old.message = text;
        await old.save();
        applied++;
        continue;
      }

      try {
        const app = await Application.create({
          volunteer: memberId,
          opportunity: opportunity._id,
          message: text,
          team: team._id,
        });
        applied++;
        try {
          await recordQuestEvent(memberId, "apply_opportunity", String(app._id));
        } catch (error) {
          console.error("Quest event failed:", error);
        }
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
      }
    }

    try {
      await Notification.create({
        recipient: opportunity.organizer,
        type: "team_application",
        title: "Team Application",
        message: `Team "${team.name}" (${applied} volunteer${applied === 1 ? "" : "s"}) applied for "${opportunity.title}".`,
        relatedOpportunity: opportunity._id,
      });
    } catch (error) {
      console.error("Team application notification failed:", error);
    }

    res.status(201).json({ applied, skipped: members.length - applied });
  } catch (error) {
    res.status(500).json({ message: "Could not apply for the team" });
  }
};

// NGO accepts every pending member of a team, or nobody
export const acceptTeam = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    const { id, teamId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(teamId)) {
      return res.status(404).json({ message: "Not found" });
    }

    const opportunity: any = await Opportunity.findById(id);
    if (!opportunity) return res.status(404).json({ message: "Opportunity not found" });
    if (user.role !== "ngo" || String(opportunity.organizer) !== user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const apps: any[] = await Application.find({
      opportunity: opportunity._id,
      team: teamId,
      status: "pending",
    });
    if (apps.length === 0) {
      return res.status(400).json({ message: "This team has no pending applications" });
    }

    const accepted = await Application.countDocuments({ opportunity: opportunity._id, status: "accepted" });
    const spotsLeft = (opportunity.capacity || 1) - accepted;
    if (apps.length > spotsLeft) {
      return res.status(400).json({
        message: `Not enough spots for the whole team (${Math.max(0, spotsLeft)} left, ${apps.length} members). Accept members one by one instead.`,
      });
    }

    for (const app of apps) {
      app.status = "accepted";
      await app.save();

      try {
        await recordQuestEvent(String(app.volunteer), "accepted_application", String(app._id));
      } catch (error) {
        console.error("Quest event failed:", error);
      }

      try {
        await Notification.create({
          recipient: app.volunteer,
          type: "application_accepted",
          title: "Application Accepted",
          message: `Your team was accepted for "${opportunity.title}".`,
          relatedApplication: app._id,
          relatedOpportunity: opportunity._id,
        });
      } catch (error) {
        console.error("Accept notification failed:", error);
      }
    }

    if (accepted + apps.length >= (opportunity.capacity || 1)) {
      opportunity.status = "closed";
      await opportunity.save();
    }

    res.json({ accepted: apps.length });
  } catch (error) {
    res.status(500).json({ message: "Could not accept the team" });
  }
};