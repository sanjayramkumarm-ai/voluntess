import { Response } from "express";
import Notification from "../models/Notification";
import { AuthReq } from "../middleware/auth";

export const mine = async (
  req: AuthReq,
  res: Response
) => {
  const notifications = await Notification.find({
    recipient: req.user!.id
  })
    .populate("relatedOpportunity", "title")
    .sort({ createdAt: -1 });

  res.json(notifications);
};

export const unreadCount = async (
  req: AuthReq,
  res: Response
) => {
  const count = await Notification.countDocuments({
    recipient: req.user!.id,
    read: false
  });

  res.json({ count });
};

export const markRead = async (
  req: AuthReq,
  res: Response
) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      recipient: req.user!.id
    },
    {
      read: true
    },
    {
      new: true
    }
  );

  if (!notification) {
    return res.status(404).json({
      message: "Notification not found"
    });
  }

  res.json(notification);
};

export const markAllRead = async (
  req: AuthReq,
  res: Response
) => {
  await Notification.updateMany(
    {
      recipient: req.user!.id,
      read: false
    },
    {
      read: true
    }
  );

  res.json({
    message: "All notifications marked as read"
  });
};