import { listMyCertificates, mySummary, downloadCertificate, setPrivacy, revokeCertificate, ngoOpportunities, ngoCompletionRows, createCompletion, updateCompletion, verifyCompletion, rejectCompletion, issueCertificate, ngoCertificates, publicVerify, publicVerifyLimiter } from "../controllers/certificates";
import { startConversation, listConversations, getMessages, sendMessage, messageOrganizer } from "../controllers/messages";
import { createTeam, myTeams, joinTeam, leaveTeam, removeMember, disbandTeam, teamApply, acceptTeam } from "../controllers/team";
import { listNgosForAdmin } from "../controllers/adminNgos";
import { badges } from "../controllers/badges";
import { createReview, getPendingReviews, getReceivedReviews, getNgoReviews } from "../controllers/review";
import { getPublicNgo, updateNgoProfile, setVerified } from "../controllers/ngo";
import { withdraw } from "../controllers/application";
import { updateProfile } from "../controllers/profile";
import { handleAvatarUpload, updateProfilePhoto } from "../controllers/upload";
import { Router } from "express";
import { protect, allow } from "../middleware/auth";
import { wrap } from "../middleware/error";
import * as auth from "../controllers/auth";
import * as opp from "../controllers/opportunity";
import * as app from "../controllers/application";
import * as notification from "../controllers/notification";
import * as quest from "../controllers/quest";

const r = Router();

r.post("/auth/register", wrap(auth.register));
r.post("/auth/login", wrap(auth.login));
r.get("/auth/me", protect, wrap(auth.me));

r.get("/opportunities", wrap(opp.list));

r.get(
  "/opportunities/mine",
  protect,
  allow("ngo"),
  wrap(opp.mine)
);

r.get(
  "/opportunities/:id",
  wrap(opp.getOne)
);

r.post(
  "/opportunities",
  protect,
  allow("ngo"),
  wrap(opp.create)
);

// NGO can delete its own opportunities.
// Admin can delete any opportunity.
r.delete(
  "/opportunities/:id",
  protect,
  allow("ngo", "admin"),
  wrap(opp.remove)
);

r.post(
  "/opportunities/:id/apply",
  protect,
  allow("volunteer"),
  wrap(app.apply)
);

r.get(
  "/opportunities/:id/applications",
  protect,
  allow("ngo"),
  wrap(app.forOpportunity)
);

r.get(
  "/applications/mine",
  protect,
  allow("volunteer"),
  wrap(app.myApplications)
);

r.patch(
  "/applications/:id",
  protect,
  allow("ngo"),
  wrap(app.decide)
);

r.get("/quests/mine", protect, allow("volunteer"), wrap(quest.mine));
r.get("/quests/leaderboard", wrap(quest.leaderboard));

r.post("/auth/profile-photo", protect, handleAvatarUpload, updateProfilePhoto);
r.get("/certificates/my", protect, listMyCertificates);
r.get("/certificates/my/summary", protect, mySummary);
r.get("/certificates/:certificateId/download", protect, downloadCertificate);
r.patch("/certificates/:certificateId/privacy", protect, setPrivacy);
r.post("/certificates/:certificateId/revoke", protect, revokeCertificate);
r.get("/ngo/completion-opportunities", protect, ngoOpportunities);
r.get("/ngo/completions", protect, ngoCompletionRows);
r.post("/ngo/completions", protect, createCompletion);
r.patch("/ngo/completions/:completionId", protect, updateCompletion);
r.post("/ngo/completions/:completionId/verify", protect, verifyCompletion);
r.post("/ngo/completions/:completionId/reject", protect, rejectCompletion);
r.post("/ngo/completions/:completionId/issue-certificate", protect, issueCertificate);
r.get("/ngo/certificates", protect, ngoCertificates);
r.get("/public/certificates/:certificateId/verify", publicVerifyLimiter, publicVerify);
r.patch("/applications/:id/withdraw", protect, withdraw);
r.get("/ngos/:id", getPublicNgo);
r.patch("/auth/ngo-profile", protect, updateNgoProfile);
r.patch("/ngos/:id/verify", protect, setVerified);
r.post("/applications/:id/review", protect, createReview);
r.get("/reviews/pending", protect, getPendingReviews);
r.get("/reviews/received", protect, getReceivedReviews);
r.get("/ngos/:id/reviews", getNgoReviews);
r.get("/quests/badges", protect, badges);
r.get("/admin/ngos", protect, listNgosForAdmin);
r.post("/teams", protect, createTeam);
r.get("/teams/mine", protect, myTeams);
r.post("/teams/join", protect, joinTeam);
r.post("/teams/:id/apply", protect, teamApply);
r.delete("/teams/:id/leave", protect, leaveTeam);
r.delete("/teams/:id/members/:userId", protect, removeMember);
r.delete("/teams/:id", protect, disbandTeam);
r.post("/opportunities/:id/teams/:teamId/accept", protect, acceptTeam);
r.post("/applications/:id/conversation", protect, startConversation);
r.get("/conversations", protect, listConversations);
r.get("/conversations/:id/messages", protect, getMessages);
r.post("/conversations/:id/messages", protect, sendMessage);
r.post("/opportunities/:id/conversation", protect, messageOrganizer);
r.get("/notifications", protect, notification.mine);
r.get("/notifications/unread-count", protect, notification.unreadCount);
r.patch("/notifications/read-all", protect, notification.markAllRead);
r.patch("/notifications/:id/read", protect, notification.markRead);
r.delete("/notifications/messages", protect, notification.clearMessageNotifications);
r.patch("/auth/me", protect, updateProfile);
r.patch("/auth/profile", protect, updateProfile);

export default r;

