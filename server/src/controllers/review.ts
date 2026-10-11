import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Review from "../models/Review";
import Application from "../models/Application";
import Opportunity from "../models/Opportunity";
import User from "../models/User";
import Notification from "../models/Notification";

const DAY = 24 * 60 * 60 * 1000;

function currentUserId(req: Request) {
  const u = (req as any).user;
  return u?.id || u?._id;
}

// An opportunity counts as ended once its date is a full day behind us
function hasEnded(date: Date | string) {
  return new Date(date).getTime() + DAY <= Date.now();
}

const reviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be 1 to 5")
    .max(5, "Rating must be 1 to 5"),
  comment: z.string().trim().max(500, "Comment must be 500 characters or less").optional(),
});

export const createReview = async (req: Request, res: Response) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid input" });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Application not found" });
    }

    const application = await Application.findById(req.params.id).populate("opportunity");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const opportunity: any = application.opportunity;
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity no longer exists" });
    }

    const userId = String(currentUserId(req));
    let direction: "volunteer_to_ngo" | "ngo_to_volunteer";
    let reviewee: any;

    if (String(application.volunteer) === userId) {
      direction = "volunteer_to_ngo";
      reviewee = opportunity.organizer;
    } else if (String(opportunity.organizer) === userId) {
      direction = "ngo_to_volunteer";
      reviewee = application.volunteer;
    } else {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (application.status !== "accepted") {
      return res.status(400).json({ message: "Only accepted volunteers can be reviewed" });
    }

    if (!hasEnded(opportunity.date)) {
      return res.status(400).json({ message: "You can leave a review after the opportunity has ended" });
    }

    const { rating, comment } = parsed.data;

    try {
      await Review.create({
        application: application._id,
        opportunity: opportunity._id,
        reviewer: userId,
        reviewee,
        direction,
        rating,
        comment: comment || "",
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: "You already reviewed this" });
      }
      throw error;
    }

    // Tell the reviewee (never blocks the review)
    try {
      await Notification.create({
        recipient: reviewee,
        type: "review_received",
        title: "New Review",
        message:
          direction === "volunteer_to_ngo"
            ? `A volunteer left a ${rating}-star review for "${opportunity.title}".`
            : `An NGO left you a ${rating}-star review for "${opportunity.title}".`,
        relatedApplication: application._id,
        relatedOpportunity: opportunity._id,
      });
    } catch (error) {
      console.error("Review notification failed:", error);
    }

    res.status(201).json({ message: "Review submitted" });
  } catch (error) {
    res.status(500).json({ message: "Could not submit review" });
  }
};

// What the logged-in user can still review
export const getPendingReviews = async (req: Request, res: Response) => {
  try {
    const userId = currentUserId(req);
    const user = await User.findById(userId).select("role");
    if (!user) return res.status(404).json({ message: "User not found" });

    const cutoff = new Date(Date.now() - DAY);
    let items: any[] = [];

    if (user.role === "volunteer") {
      const apps: any[] = await Application.find({ volunteer: userId, status: "accepted" })
        .populate({
          path: "opportunity",
          select: "title date organizer",
          populate: { path: "organizer", select: "name" },
        })
        .lean();

      const ended = apps.filter((a) => a.opportunity && new Date(a.opportunity.date) <= cutoff);
      const done = await Review.distinct("application", {
        application: { $in: ended.map((a) => a._id) },
        direction: "volunteer_to_ngo",
      });
      const doneSet = new Set(done.map(String));

      items = ended
        .filter((a) => !doneSet.has(String(a._id)))
        .map((a) => ({
          applicationId: a._id,
          direction: "volunteer_to_ngo",
          opportunity: { _id: a.opportunity._id, title: a.opportunity.title, date: a.opportunity.date },
          target: { _id: a.opportunity.organizer?._id, name: a.opportunity.organizer?.name || "NGO" },
        }));
    } else if (user.role === "ngo") {
      const opps: any[] = await Opportunity.find({ organizer: userId, date: { $lte: cutoff } })
        .select("title date")
        .lean();
      const oppMap = new Map<string, any>(opps.map((o) => [String(o._id), o] as [string, any]));

      const apps: any[] = await Application.find({
        opportunity: { $in: opps.map((o) => o._id) },
        status: "accepted",
      })
        .populate("volunteer", "name")
        .lean();

      const done = await Review.distinct("application", {
        application: { $in: apps.map((a) => a._id) },
        direction: "ngo_to_volunteer",
      });
      const doneSet = new Set(done.map(String));

      items = apps
        .filter((a) => !doneSet.has(String(a._id)) && a.volunteer)
        .map((a) => {
          const o = oppMap.get(String(a.opportunity));
          return {
            applicationId: a._id,
            direction: "ngo_to_volunteer",
            opportunity: { _id: o?._id, title: o?.title || "", date: o?.date },
            target: { _id: a.volunteer._id, name: a.volunteer.name || "Volunteer" },
          };
        });
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Could not load pending reviews" });
  }
};

async function summarize(match: any) {
  const [stats] = await Review.aggregate([
    { $match: match },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const reviews: any[] = await Review.find(match)
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("reviewer", "name")
    .populate("opportunity", "title")
    .lean();

  return {
    average: stats ? Math.round(stats.average * 10) / 10 : 0,
    count: stats ? stats.count : 0,
    reviews: reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      direction: r.direction,
      reviewerName: r.reviewer?.name || "Anonymous",
      opportunityTitle: r.opportunity?.title || "",
    })),
  };
}

// Reviews about the logged-in user
export const getReceivedReviews = async (req: Request, res: Response) => {
  try {
    const me = new mongoose.Types.ObjectId(String(currentUserId(req)));
    res.json(await summarize({ reviewee: me }));
  } catch (error) {
    res.status(500).json({ message: "Could not load reviews" });
  }
};

// Public: reviews volunteers left for an NGO
export const getNgoReviews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "NGO not found" });
    }
    const ngoId = new mongoose.Types.ObjectId(String(Array.isArray(id) ? id[0] : id));
    res.json(await summarize({ reviewee: ngoId, direction: "volunteer_to_ngo" }));
  } catch (error) {
    res.status(500).json({ message: "Could not load reviews" });
  }
};