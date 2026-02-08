import { Router } from "express";
import {
  discoverClubs,
  discoverClubDetail,
  discoverOpenRoles,
} from "../controllers/discover.controller.ts";

const discoverRouter = Router();

discoverRouter.get("/clubs", discoverClubs);
discoverRouter.get("/clubs/:clubId", discoverClubDetail);
discoverRouter.get("/open-roles", discoverOpenRoles);

export default discoverRouter;
