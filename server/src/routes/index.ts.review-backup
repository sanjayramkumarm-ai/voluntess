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
r.patch("/applications/:id/withdraw", protect, withdraw);
r.get("/ngos/:id", getPublicNgo);
r.patch("/auth/ngo-profile", protect, updateNgoProfile);
r.patch("/ngos/:id/verify", protect, setVerified);
r.patch("/auth/me", protect, updateProfile);
r.patch("/auth/profile", protect, updateProfile);

export default r;

