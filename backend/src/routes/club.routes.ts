import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.ts";
import { authorize } from "../middleware/auth/authorize.ts";
import { requireApprovedExec, requireSuperAdmin } from "../middleware/auth/clubAuth.ts";
import { Role } from "../models/User.ts";
import {
  listClubs,
  getClub,
  createClub,
  updateClub,
  getRoster,
  requestJoin,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  updateExecProfile,
} from "../controllers/club.controller.ts";
import { listOpenRoles, createOpenRole } from "../controllers/openRole.controller.ts";
import { listApplicationsForClub } from "../controllers/application.controller.ts";

const clubRouter = Router();

// Public
clubRouter.get("/", listClubs);
clubRouter.get("/:clubId", authenticate, getClub);
clubRouter.get("/:clubId/roster", getRoster);
clubRouter.get("/:clubId/open-roles", listOpenRoles);

// Open role creation (approved exec)
clubRouter.post("/:clubId/open-roles", authenticate, requireApprovedExec, createOpenRole);

// Applications for a club (approved exec)
clubRouter.get("/:clubId/applications", authenticate, requireApprovedExec, listApplicationsForClub);

// Auth required
clubRouter.post("/", authenticate, createClub);
clubRouter.post("/:clubId/join", authenticate, requestJoin);

// Approved exec
clubRouter.patch("/:clubId", authenticate, requireApprovedExec, updateClub);

// Superadmin
clubRouter.get("/:clubId/join-requests", authenticate, requireSuperAdmin, listJoinRequests);
clubRouter.post("/:clubId/join-requests/:userId/approve", authenticate, requireSuperAdmin, approveJoinRequest);
clubRouter.post("/:clubId/join-requests/:userId/reject", authenticate, requireSuperAdmin, rejectJoinRequest);

export default clubRouter;
