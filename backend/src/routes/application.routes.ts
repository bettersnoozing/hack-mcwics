import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.ts";
import { getApplicationDetail, updateApplicationStatus } from "../controllers/application.controller.ts";

const applicationRouter = Router();

applicationRouter.get("/:applicationId", authenticate, getApplicationDetail);
applicationRouter.patch("/:applicationId/status", authenticate, updateApplicationStatus);

export default applicationRouter;
