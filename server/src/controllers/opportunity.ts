import { Response } from "express";
import { z } from "zod";
import Opportunity from "../models/Opportunity";
import { AuthReq } from "../middleware/auth";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  category: z.string().min(1),
  location: z.string().min(1),
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  capacity: z.coerce.number().int().min(1),
  skills: z.array(z.string()).optional()
});

export const list = async (req: any, res: Response) => {
  const {
    q = "",
    category = "",
    sort = "newest"
  } = req.query;

  const filter: any = { status: "open" };

  if (category) filter.category = category;

  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } }
    ];
  }

  const query = Opportunity.find(filter)
    .populate("organizer", "name");

  if (sort === "soonest") {
    query.sort({ date: 1 });
  } else {
    query.sort({ createdAt: -1 });
  }

  const items = await query;

  res.json({
    items,
    total: items.length
  });
};

export const getOne = async (req: any, res: Response) => {
  const item = await Opportunity.findById(req.params.id)
    .populate("organizer", "name");

  if (!item) {
    return res.status(404).json({
      message: "Opportunity not found"
    });
  }

  res.json(item);
};

export const mine = async (req: AuthReq, res: Response) => {
  const items = await Opportunity.find({
    organizer: req.user!.id
  }).sort({ createdAt: -1 });

  res.json(items);
};

export const create = async (req: AuthReq, res: Response) => {
  const d = schema.parse(req.body);

  const item = await Opportunity.create({
    ...d,
    date: new Date(d.date),
    organizer: req.user!.id
  });

  res.status(201).json(item);
};

export const remove = async (req: AuthReq, res: Response) => {
  const opportunity = await Opportunity.findById(req.params.id);

  if (!opportunity) {
    return res.status(404).json({
      message: "Opportunity not found"
    });
  }

  // NGO can delete only its own opportunity
  if (
    req.user!.role === "ngo" &&
    String(opportunity.organizer) !== String(req.user!.id)
  ) {
    return res.status(403).json({
      message: "You can only delete your own opportunities"
    });
  }

  // Admin can delete any opportunity
  await Opportunity.findByIdAndDelete(req.params.id);

  res.json({
    message: "Opportunity deleted successfully"
  });
};
