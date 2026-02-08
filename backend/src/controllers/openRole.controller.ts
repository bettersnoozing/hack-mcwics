import { Request, Response } from "express";
import { Types } from "mongoose";
import { OpenRole } from "../models/OpenRole.ts";
import { Club } from "../models/Club.ts";

/**
 * GET /clubs/:clubId/open-roles
 * Public — list all open roles for a club.
 */
export async function listOpenRoles(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;
    const roles = await OpenRole.find({ club: new Types.ObjectId(clubId) }).sort({ createdAt: -1 }).lean();
    res.json(roles);
  } catch (err) {
    console.error("listOpenRoles error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /clubs/:clubId/open-roles
 * Auth: approved exec of club.
 * Body: { jobTitle, description, deadline, applicationQuestions? }
 */
export async function createOpenRole(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;
    const { jobTitle, description, deadline, applicationQuestions } = req.body as {
      jobTitle: string;
      description: string;
      deadline: string;
      applicationQuestions?: string[];
    };

    if (!jobTitle?.trim()) return res.status(400).json({ message: "Job title is required" });
    if (!description?.trim()) return res.status(400).json({ message: "Description is required" });
    if (!deadline) return res.status(400).json({ message: "Deadline is required" });

    const role = await OpenRole.create({
      _id: new Types.ObjectId(),
      club: new Types.ObjectId(clubId),
      jobTitle: jobTitle.trim(),
      description: description.trim(),
      deadline: new Date(deadline),
      applicationQuestions: applicationQuestions ?? [],
    });

    await Club.findByIdAndUpdate(clubId, { $push: { openRoles: role._id } });

    res.status(201).json(role);
  } catch (err) {
    console.error("createOpenRole error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /open-roles/:openRoleId
 * Public — get a single open role.
 */
export async function getOpenRole(req: Request, res: Response) {
  try {
    const openRoleId = req.params.openRoleId as string;
    const role = await OpenRole.findById(openRoleId).lean();
    if (!role) return res.status(404).json({ message: "Open role not found" });
    res.json(role);
  } catch (err) {
    console.error("getOpenRole error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * PATCH /open-roles/:openRoleId
 * Auth: approved exec of the role's club (checked via middleware on the club route).
 * Body: { jobTitle?, description?, deadline?, applicationQuestions? }
 */
export async function updateOpenRole(req: Request, res: Response) {
  try {
    const openRoleId = req.params.openRoleId as string;
    const { jobTitle, description, deadline, applicationQuestions } = req.body as {
      jobTitle?: string;
      description?: string;
      deadline?: string;
      applicationQuestions?: string[];
    };

    const update: Record<string, unknown> = {};
    if (jobTitle !== undefined) update.jobTitle = jobTitle.trim();
    if (description !== undefined) update.description = description.trim();
    if (deadline !== undefined) update.deadline = new Date(deadline);
    if (applicationQuestions !== undefined) update.applicationQuestions = applicationQuestions;

    if (!Object.keys(update).length) return res.status(400).json({ message: "No fields to update" });

    const role = await OpenRole.findByIdAndUpdate(openRoleId, update, { new: true }).lean();
    if (!role) return res.status(404).json({ message: "Open role not found" });
    res.json(role);
  } catch (err) {
    console.error("updateOpenRole error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * DELETE /open-roles/:openRoleId
 * Auth: approved exec of the role's club.
 */
export async function deleteOpenRole(req: Request, res: Response) {
  try {
    const openRoleId = req.params.openRoleId as string;

    const role = await OpenRole.findByIdAndDelete(openRoleId).lean();
    if (!role) return res.status(404).json({ message: "Open role not found" });

    await Club.findByIdAndUpdate(role.club, { $pull: { openRoles: role._id } });

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteOpenRole error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}
