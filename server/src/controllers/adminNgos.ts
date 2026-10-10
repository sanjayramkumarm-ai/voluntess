import { Request, Response } from "express";
import User from "../models/User";
import Opportunity from "../models/Opportunity";

// Admin only: every NGO account, unverified first
export const listNgosForAdmin = async (req: Request, res: Response) => {
  try {
    const u = (req as any).user;
    const actor = await User.findById(u?.id || u?._id).select("role");

    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const ngos: any[] = await User.find({ role: "ngo" })
      .select("name email city about website verified profilePhoto createdAt")
      .sort({ verified: 1, createdAt: -1 })
      .lean();

    const counts = await Opportunity.aggregate([
      { $group: { _id: "$organizer", total: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>(
      counts.map((c: any) => [String(c._id), c.total] as [string, number])
    );

    res.json(
      ngos.map((n) => ({
        _id: n._id,
        name: n.name,
        email: n.email,
        city: n.city || "",
        about: n.about || "",
        website: n.website || "",
        verified: Boolean(n.verified),
        profilePhoto: n.profilePhoto || "",
        createdAt: n.createdAt,
        opportunities: countMap.get(String(n._id)) || 0,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Could not load NGOs" });
  }
};