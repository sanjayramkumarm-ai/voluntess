import { Response } from "express";
import { z } from "zod";
import User from "../models/User";
import { AuthReq } from "../middleware/auth";

const schema = z.object({
  name: z.string().trim().min(2, "Name needs 2+ characters").max(80).optional(),
  city: z.string().trim().max(80).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const updateProfile = async (req: AuthReq, res: Response) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: parsed.error.issues[0]?.message || "Invalid profile data" });
    }

    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const d = parsed.data;
    const update: Record<string, unknown> = {};
    if (d.name !== undefined) update.name = d.name;
    if (d.city !== undefined) update.city = d.city;
    if (d.skills !== undefined) update.skills = Array.from(new Set(d.skills));

    user.set(update);
    await user.save();

    res.json({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      city: user.city,
      skills: user.skills,
      profilePhoto: user.profilePhoto || "",
    });
  } catch (error) {
    res.status(500).json({ message: "Could not update profile" });
  }
};
