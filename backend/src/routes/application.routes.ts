import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.ts";
import { listMyApplications, listMyAppliedRoles, submitApplication, getApplicationDetail, updateApplicationStatus } from "../controllers/application.controller.ts";

const applicationRouter = Router();

applicationRouter.post("/", authenticate, submitApplication);
applicationRouter.get("/mine", authenticate, listMyApplications);
applicationRouter.get("/mine/roles", authenticate, listMyAppliedRoles);
applicationRouter.get("/:applicationId", authenticate, getApplicationDetail);
applicationRouter.patch("/:applicationId/status", authenticate, updateApplicationStatus);

export default applicationRouter;
