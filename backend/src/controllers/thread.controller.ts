import { Request, Response } from "express";
import { Types } from "mongoose";
import { CommentThread, CommentThreadType, CommentThreadVisibility } from "../models/CommentThread.ts";
import { Club } from "../models/Club.ts";
import { OpenRole } from "../models/OpenRole.ts";
import { Application } from "../models/Application.ts";

export async function isClubLeader(userId: string, clubId: string): Promise<boolean> {
  const oid = new Types.ObjectId(userId);
  const cid = new Types.ObjectId(clubId);
  const exists = await Club.exists({
    _id: cid,
    $or: [{ execs: oid }, { admins: oid }],
  });
  console.log("[DEBUG] isClubLeader userId=%s clubId=%s result=%s", userId, clubId, !!exists);
  return !!exists;
}

export async function isClubApplicant(userId: string, clubId: string): Promise<boolean> {
  const cid = new Types.ObjectId(clubId);
  const uid = new Types.ObjectId(userId);
  const roles = await OpenRole.find({ club: cid }).select("_id").lean();
  console.log("[DEBUG] isClubApplicant userId=%s clubId=%s openRoles=%d", userId, clubId, roles.length);
  if (!roles.length) return false;
  const roleIds = roles.map((r) => r._id);
  const exists = await Application.exists({
    applicant: uid,
    openRole: { $in: roleIds },
  });
  console.log("[DEBUG] isClubApplicant application exists=%s", !!exists);
  return !!exists;
}

export async function authorizeThreadAccess(
  thread: { visibility: string; clubId: Types.ObjectId },
  userId: string
): Promise<boolean> {
  console.log("[DEBUG] authorizeThreadAccess visibility=%s clubId=%s userId=%s", thread.visibility, thread.clubId, userId);
  if (thread.visibility === CommentThreadVisibility.PUBLIC) return true;
  if (thread.visibility === CommentThreadVisibility.CLUB_LEADERS) {
    return isClubLeader(userId, thread.clubId.toString());
  }
  if (thread.visibility === CommentThreadVisibility.CLUB_APPLICANTS) {
    const leader = await isClubLeader(userId, thread.clubId.toString());
    if (leader) return true;
    return isClubApplicant(userId, thread.clubId.toString());
  }
  return false;
}

/**
 * POST /clubs/:clubId/forum-thread
 * Idempotent get-or-create of the single FORUM thread for a club.
 */
export async function getOrCreateForumThread(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const clubId = req.params.clubId as string;
    console.log("[DEBUG] getOrCreateForumThread userId=%s clubId=%s", userId, clubId);

    const club = await Club.findById(clubId).lean();
    if (!club) {
      console.log("[DEBUG] getOrCreateForumThread club not found for clubId=%s", clubId);
      return res.status(404).json({ message: "Club not found" });
    }

    const leader = await isClubLeader(userId, clubId);
    const applicant = await isClubApplicant(userId, clubId);
    console.log("[DEBUG] getOrCreateForumThread leader=%s applicant=%s", leader, applicant);
    if (!leader && !applicant) {
      return res.status(403).json({ message: "You must be a club leader or applicant to access this forum" });
    }

    let thread = await CommentThread.findOne({
      type: CommentThreadType.FORUM,
      clubId: new Types.ObjectId(clubId),
    });

    if (!thread) {
      thread = await CommentThread.create({
        type: CommentThreadType.FORUM,
        clubId: new Types.ObjectId(clubId),
        createdBy: new Types.ObjectId(userId),
        visibility: CommentThreadVisibility.CLUB_APPLICANTS,
        locked: false,
        title: `${club.name} Forum`,
        commentCount: 0,
      });
    }

    res.json(thread);
  } catch (err) {
    console.error("getOrCreateForumThread error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /applications/:applicationId/review-thread
 * Idempotent get-or-create of the REVIEW thread for an application.
 */
export async function getOrCreateReviewThread(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const applicationId = req.params.applicationId as string;

    const app = await Application.findById(applicationId).populate("openRole", "club");
    if (!app) return res.status(404).json({ message: "Application not found" });

    const openRole = app.openRole as unknown as { club: Types.ObjectId };
    const clubId = openRole.club.toString();

    const leader = await isClubLeader(userId, clubId);
    if (!leader) {
      return res.status(403).json({ message: "Only club leaders can access review threads" });
    }

    let thread = await CommentThread.findOne({
      type: CommentThreadType.REVIEW,
      application: new Types.ObjectId(applicationId),
    });

    if (!thread) {
      thread = await CommentThread.create({
        type: CommentThreadType.REVIEW,
        clubId: new Types.ObjectId(clubId),
        createdBy: new Types.ObjectId(userId),
        visibility: CommentThreadVisibility.CLUB_LEADERS,
        locked: false,
        title: "Application Review",
        application: new Types.ObjectId(applicationId),
        commentCount: 0,
      });
    }

    res.json(thread);
  } catch (err) {
    console.error("getOrCreateReviewThread error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /comment-threads/:threadId
 * Read thread metadata with access control.
 */
export async function getThread(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const threadId = req.params.threadId as string;

    const thread = await CommentThread.findById(threadId);
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const allowed = await authorizeThreadAccess(thread, userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    res.json(thread);
  } catch (err) {
    console.error("getThread error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}
