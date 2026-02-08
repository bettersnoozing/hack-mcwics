import { Request, Response } from "express";
import { Types } from "mongoose";
import { Application, ApplicationStatus } from "../models/Application.ts";
import { Club } from "../models/Club.ts";

/**
 * GET /clubs/:clubId/applications?openRoleId=&status=
 * Auth: approved exec of the club.
 * Returns applications with populated applicant (name, email) and openRole (jobTitle).
 */
export async function listApplicationsForClub(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;

    const club = await Club.findById(clubId).lean();
    if (!club) return res.status(404).json({ message: "Club not found" });

    // Build filter: all openRoles belonging to this club
    const filter: Record<string, unknown> = {
      openRole: { $in: club.openRoles ?? [] },
    };

    const { openRoleId, status } = req.query;
    if (openRoleId && typeof openRoleId === "string") {
      filter.openRole = new Types.ObjectId(openRoleId);
    }
    if (status && typeof status === "string" && Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
      filter.status = status;
    }

    const apps = await Application.find(filter)
      .populate("applicant", "name email")
      .populate("openRole", "jobTitle")
      .sort({ createdAt: -1 })
      .lean();

    res.json(apps);
  } catch (err) {
    console.error("listApplicationsForClub error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /applications/:applicationId
 * Auth: logged-in user.
 * Populates applicant and openRole.
 */
export async function getApplicationDetail(req: Request, res: Response) {
  try {
    const applicationId = req.params.applicationId as string;

    const app = await Application.findById(applicationId)
      .populate("applicant", "name email")
      .populate("openRole", "jobTitle description applicationQuestions club")
      .lean();

    if (!app) return res.status(404).json({ message: "Application not found" });
    res.json(app);
  } catch (err) {
    console.error("getApplicationDetail error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * PATCH /applications/:applicationId/status
 * Auth: logged-in user (should be an exec — enforced via frontend or additional middleware).
 * Body: { status }
 */
export async function updateApplicationStatus(req: Request, res: Response) {
  try {
    const applicationId = req.params.applicationId as string;
    const { status } = req.body as { status: string };

    if (!status || !Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${Object.values(ApplicationStatus).join(", ")}`,
      });
    }

    const app = await Application.findByIdAndUpdate(
      applicationId,
      { status },
      { new: true },
    )
      .populate("applicant", "name email")
      .populate("openRole", "jobTitle")
      .lean();

    if (!app) return res.status(404).json({ message: "Application not found" });
    res.json(app);
  } catch (err) {
    console.error("updateApplicationStatus error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}
