import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.ts";
import { softDeleteComment, editComment } from "../controllers/comment.controller.ts";

const commentRouter = Router();

commentRouter.patch("/:commentId/delete", authenticate, softDeleteComment);
commentRouter.patch("/:commentId", authenticate, editComment);

export default commentRouter;
