import { Request, Response } from "express";
import { Types } from "mongoose";
import { Comment } from "../models/Comment.ts";
import { CommentThread } from "../models/CommentThread.ts";
import { authorizeThreadAccess, isClubLeader } from "./thread.controller.ts";

/**
 * GET /comment-threads/:threadId/comments
 * Flat list of comments sorted by createdAt, frontend builds tree.
 */
export async function listComments(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const threadId = req.params.threadId as string;

    const thread = await CommentThread.findById(threadId);
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const allowed = await authorizeThreadAccess(thread, userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const comments = await Comment.find({ threadId: thread._id })
      .sort({ createdAt: 1 })
      .populate("author", "name profilePhotoUrl roles");

    res.json(comments);
  } catch (err) {
    console.error("listComments error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /comment-threads/:threadId/comments
 * Create a comment or reply.
 */
export async function createComment(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const threadId = req.params.threadId as string;

    const thread = await CommentThread.findById(threadId);
    if (!thread) return res.status(404).json({ message: "Thread not found" });
    if (thread.locked) return res.status(403).json({ message: "Thread is locked" });

    const allowed = await authorizeThreadAccess(thread, userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const { body, parentId, stars } = req.body as {
      body?: string;
      parentId?: string | null;
      stars?: number;
    };

    if (!body?.trim()) return res.status(400).json({ message: "Comment body is required" });

    if (parentId) {
      const parent = await Comment.findById(parentId).lean();
      if (!parent || parent.threadId.toString() !== thread._id.toString()) {
        return res.status(400).json({ message: "parentId does not belong to this thread" });
      }
    }

    let validatedStars: number | undefined;
    if (stars !== undefined && stars !== null) {
      if (thread.type !== "REVIEW") {
        return res.status(400).json({ message: "Stars are only allowed on review threads" });
      }
      if (parentId) {
        return res.status(400).json({ message: "Stars are only allowed on top-level comments" });
      }
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return res.status(400).json({ message: "Stars must be an integer between 1 and 5" });
      }
      validatedStars = stars;
    }

    const comment = await Comment.create({
      threadId: thread._id,
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      author: new Types.ObjectId(userId),
      body: body.trim(),
      deleted: false,
      ...(validatedStars !== undefined && { stars: validatedStars }),
    });

    await CommentThread.findByIdAndUpdate(thread._id, { $inc: { commentCount: 1 } });

    const populated = await Comment.findById(comment._id).populate(
      "author",
      "name profilePhotoUrl roles"
    );

    res.status(201).json(populated);
  } catch (err) {
    console.error("createComment error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * PATCH /comments/:commentId/delete
 * Soft delete with thread-type-aware permissions:
 *   FORUM  -> author OR club leader for that club
 *   REVIEW -> author only (execs cannot delete each other's reviews)
 */
export async function softDeleteComment(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const commentId = req.params.commentId as string;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.deleted) {
      return res.json(comment);
    }

    const thread = await CommentThread.findById(comment.threadId);
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const isAuthor = comment.author.toString() === userId;

    if (thread.type === "REVIEW") {
      if (!isAuthor) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }
    } else {
      // FORUM: author OR club leader
      if (!isAuthor) {
        const leader = await isClubLeader(userId, thread.clubId.toString());
        if (!leader) {
          return res.status(403).json({ message: "You can only delete your own comments" });
        }
      }
    }

    comment.deleted = true;
    comment.body = "[deleted]";
    await comment.save();

    const populated = await Comment.findById(comment._id).populate(
      "author",
      "name profilePhotoUrl roles"
    );

    res.json(populated);
  } catch (err) {
    console.error("softDeleteComment error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * PATCH /comments/:commentId
 * Edit own comment: body and/or stars (stars only on REVIEW top-level).
 */
export async function editComment(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const commentId = req.params.commentId as string;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.author.toString() !== userId) {
      return res.status(403).json({ message: "You can only edit your own comments" });
    }

    if (comment.deleted) {
      return res.status(400).json({ message: "Cannot edit a deleted comment" });
    }

    const { body, stars } = req.body as { body?: string; stars?: number };

    const thread = await CommentThread.findById(comment.threadId);
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    if (stars !== undefined && stars !== null) {
      if (thread.type !== "REVIEW") {
        return res.status(400).json({ message: "Stars are only allowed on review threads" });
      }
      if (comment.parentId) {
        return res.status(400).json({ message: "Stars are only allowed on top-level comments" });
      }
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return res.status(400).json({ message: "Stars must be an integer between 1 and 5" });
      }
      comment.stars = stars;
    }

    if (body !== undefined) {
      if (!body.trim()) {
        return res.status(400).json({ message: "Comment body cannot be empty" });
      }
      comment.body = body.trim();
    }

    await comment.save();

    const populated = await Comment.findById(comment._id).populate(
      "author",
      "name profilePhotoUrl roles"
    );

    res.json(populated);
  } catch (err) {
    console.error("editComment error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}
