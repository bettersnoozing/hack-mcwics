import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.ts";
import {
  getOrCreateForumThread,
  getOrCreateReviewThread,
  getThread,
} from "../controllers/thread.controller.ts";
import { listComments, createComment } from "../controllers/comment.controller.ts";

const threadRouter = Router();

// Forum thread: idempotent get-or-create
threadRouter.post("/clubs/:clubId/forum-thread", authenticate, getOrCreateForumThread);

// Review thread: idempotent get-or-create
threadRouter.post("/applications/:applicationId/review-thread", authenticate, getOrCreateReviewThread);

// Read thread metadata
threadRouter.get("/comment-threads/:threadId", authenticate, getThread);

// List comments in a thread
threadRouter.get("/comment-threads/:threadId/comments", authenticate, listComments);

// Create comment or reply
threadRouter.post("/comment-threads/:threadId/comments", authenticate, createComment);

export default threadRouter;
