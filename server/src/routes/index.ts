import { Router } from "express";
import { protect, allow } from "../middleware/auth";
import { wrap } from "../middleware/error";
import * as auth from "../controllers/auth";
import * as opp from "../controllers/opportunity";
import * as app from "../controllers/application";
import * as notification from "../controllers/notification";

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

export default r;
