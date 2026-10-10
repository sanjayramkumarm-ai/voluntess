import { Response } from "express";
import { z } from "zod";
import Application from "../models/Application";
import Opportunity from "../models/Opportunity";
import { AuthReq } from "../middleware/auth";
import Notification from "../models/Notification";
import { recordQuestEvent } from "./questRewards";

export const apply = async (req: AuthReq, res: Response) => {
  const message = z
    .object({ message: z.string().optional() })
    .parse(req.body || {});

  const opportunity = await Opportunity.findById(req.params.id);

  if (!opportunity) {
    return res.status(404).json({ message: "Opportunity not found" });
  }

  if (opportunity.status === "closed") {
    return res
      .status(400)
      .json({ message: "This opportunity is no longer accepting volunteers" });
  }

  const existing = await Application.findOne({
    volunteer: req.user!.id,
    opportunity: opportunity._id
  });

  if (existing) {
    return res
      .status(409)
      .json({ message: "You have already applied to this opportunity" });
  }

  const acceptedCount = await Application.countDocuments({
    opportunity: opportunity._id,
    status: "accepted"
  });

  if (acceptedCount >= (opportunity.capacity || 1)) {
    return res
      .status(400)
      .json({ message: "All volunteer spots are filled" });
  }

  const application = await Application.create({
    volunteer: req.user!.id,
    opportunity: opportunity._id,
    message: message.message || ""
  });

  try {
    await recordQuestEvent(
      req.user!.id,
      "apply_opportunity",
      String(application._id)
    );
  } catch (error) {
    console.error("Quest reward update failed:", error);
  }

  res.status(201).json(application);
};

export const forOpportunity = async (req: AuthReq, res: Response) => {
  const opportunity = await Opportunity.findOne({
    _id: req.params.id,
    organizer: req.user!.id
  });

  if (!opportunity) {
    return res.status(404).json({ message: "Opportunity not found" });
  }

  const apps = await Application.find({ opportunity: opportunity._id })
    .populate("volunteer", "name email city skills")
    .sort({ createdAt: -1 });

  res.json(apps);
};

export const myApplications = async (req: AuthReq, res: Response) => {
  const apps = await Application.find({ volunteer: req.user!.id })
    .populate("opportunity")
    .sort({ createdAt: -1 });

  res.json(apps);
};

export const decide = async (req: AuthReq, res: Response) => {
  const { status } = z
    .object({ status: z.enum(["accepted", "rejected"]) })
    .parse(req.body);

  const application = await Application.findById(req.params.id).populate(
    "opportunity"
  );

  if (!application) {
    return res.status(404).json({ message: "Application not found" });
  }

  const opportunity: any = application.opportunity;

  if (!opportunity) {
    return res.status(404).json({ message: "Opportunity no longer exists" });
  }

  if (String(opportunity.organizer) !== String(req.user!.id)) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const wasAlreadyAccepted = application.status === "accepted";
  const capacity = opportunity.capacity || 1;

  if (status === "accepted" && !wasAlreadyAccepted) {
    const acceptedCount = await Application.countDocuments({
      opportunity: opportunity._id,
      status: "accepted"
    });

    if (acceptedCount >= capacity) {
      return res.status(400).json({
        message: "All spots are filled. Increase capacity or reject someone first."
      });
    }
  }

  application.status = status;
  await application.save();

  // Close when full, reopen if a spot frees up
  try {
    const nowAccepted = await Application.countDocuments({
      opportunity: opportunity._id,
      status: "accepted"
    });

    if (nowAccepted >= capacity && opportunity.status !== "closed") {
      opportunity.status = "closed";
      await opportunity.save();
    } else if (nowAccepted < capacity && opportunity.status === "closed") {
      opportunity.status = "open";
      await opportunity.save();
    }
  } catch (error) {
    console.error("Opportunity status update failed:", error);
  }

  if (status === "accepted" && !wasAlreadyAccepted) {
    try {
      await recordQuestEvent(
        String(application.volunteer),
        "accepted_application",
        String(application._id)
      );
    } catch (error) {
      console.error("Acceptance Quest update failed:", error);
    }
  }

  const opportunityTitle = opportunity.title || "volunteering opportunity";

  if (status === "accepted") {
    await Notification.create({
      recipient: application.volunteer,
      type: "application_accepted",
      title: "Application Accepted",
      message: `Your application for "${opportunityTitle}" has been accepted.`,
      relatedApplication: application._id,
      relatedOpportunity: opportunity._id
    });
  } else {
    await Notification.create({
      recipient: application.volunteer,
      type: "application_rejected",
      title: "Application Update",
      message: `Your application for "${opportunityTitle}" was rejected.`,
      relatedApplication: application._id,
      relatedOpportunity: opportunity._id
    });
  }

  res.json(application);
};
