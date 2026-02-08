import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.ts";
import { requireOpenRoleExec } from "../middleware/auth/openRoleAuth.ts";
import { getOpenRole, updateOpenRole, deleteOpenRole } from "../controllers/openRole.controller.ts";

const openRoleRouter = Router();

// These operate on /open-roles/:openRoleId (not nested under /clubs)
openRoleRouter.get("/:openRoleId", getOpenRole);
openRoleRouter.patch("/:openRoleId", authenticate, requireOpenRoleExec, updateOpenRole);
openRoleRouter.delete("/:openRoleId", authenticate, requireOpenRoleExec, deleteOpenRole);

export default openRoleRouter;
