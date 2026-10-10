import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import User from "../models/User";
import Opportunity from "../models/Opportunity";
import Application from "../models/Application";

const PUBLIC_FIELDS = "name city profilePhoto about website verified createdAt";

function currentUserId(req: Request) {
  const u = (req as any).user;
  return u?.id || u?._id;
}

// Public: anyone can view an NGO profile
export const getPublicNgo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "NGO not found" });
    }

    const ngo = await User.findOne({ _id: id, role: "ngo" }).select(PUBLIC_FIELDS);

    if (!ngo) {
      return res.status(404).json({ message: "NGO not found" });
    }

    const opportunities = await Opportunity.find({ organizer: ngo._id })
      .select("title category location date status capacity")
      .sort({ date: -1 })
      .lean();

    const now = new Date();
    const pastAll = opportunities.filter((o) => new Date(o.date) < now);
    const upcoming = opportunities
      .filter((o) => new Date(o.date) >= now)
      .reverse()
      .slice(0, 20);

    const pastIds = pastAll.map((o) => o._id);
    const helpers = pastIds.length
      ? await Application.distinct("volunteer", {
          opportunity: { $in: pastIds },
          status: "accepted",
        })
      : [];

    res.json({
      ngo,
      upcoming,
      past: pastAll.slice(0, 20),
      stats: {
        opportunities: opportunities.length,
        completed: pastAll.length,
        volunteersHelped: helpers.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load NGO profile" });
  }
};

const profileSchema = z.object({
  about: z.string().trim().max(1000, "Description must be 1000 characters or less").optional(),
  city: z.string().trim().max(80, "City is too long").optional(),
  website: z
    .string()
    .trim()
    .max(200, "Website is too long")
    .refine((v) => {
      if (v === "") return true;
      try {
        const url = new URL(v);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Website must be a full link starting with http:// or https://")
    .optional(),
});

// NGO edits its own profile (verified is deliberately not editable here)
export const updateNgoProfile = async (req: Request, res: Response) => {
  try {
    const parsed = profileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const user = await User.findById(currentUserId(req));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "ngo") {
      return res.status(403).json({ message: "Only NGO accounts can edit this profile" });
    }

    const data = parsed.data;
    if (data.about !== undefined) user.about = data.about;
    if (data.website !== undefined) user.website = data.website;
    if (data.city !== undefined) user.city = data.city;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      city: user.city,
      about: user.about,
      website: user.website,
      verified: user.verified,
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    res.status(500).json({ message: "Could not update profile" });
  }
};

// Admin only: grant or remove the Verified badge
export const setVerified = async (req: Request, res: Response) => {
  try {
    const actor = await User.findById(currentUserId(req)).select("role");

    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;
    const verified = req.body?.verified;

    if (!mongoose.isValidObjectId(id) || typeof verified !== "boolean") {
      return res.status(400).json({ message: "Provide a valid NGO id and verified: true/false" });
    }

    const ngo = await User.findOneAndUpdate(
      { _id: id, role: "ngo" },
      { verified },
      { new: true }
    ).select(PUBLIC_FIELDS);

    if (!ngo) {
      return res.status(404).json({ message: "NGO not found" });
    }

    res.json(ngo);
  } catch (error) {
    res.status(500).json({ message: "Could not update verification" });
  }
};