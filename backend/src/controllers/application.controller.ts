import { Request, Response } from "express";
import { Types } from "mongoose";
import { Application, ApplicationStatus } from "../models/Application.ts";
import { OpenRole } from "../models/OpenRole.ts";
import { Club } from "../models/Club.ts";

/**
 * GET /applications/mine
 * Auth: logged-in user.
 * Returns the authenticated user's applications with populated openRole (jobTitle, club).
 */
export async function listMyApplications(req: Request, res: Response) {
  try {
    const applicantId = new Types.ObjectId(req.user!.sub);

    const apps = await Application.find({ applicant: applicantId })
      .populate({
        path: "openRole",
        select: "jobTitle description deadline club",
        populate: { path: "club", select: "name" },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(apps);
  } catch (err) {
    console.error("listMyApplications error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

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
 * GET /applications/mine/roles
 * Auth: logged-in user.
 * Returns array of openRole IDs that the user has applied to.
 */
export async function listMyAppliedRoles(req: Request, res: Response) {
  try {
    const applicantId = new Types.ObjectId(req.user!.sub);
    const apps = await Application.find({ applicant: applicantId }).select("openRole").lean();
    const roleIds = apps.map((a) => a.openRole.toString());
    res.json(roleIds);
  } catch (err) {
    console.error("listMyAppliedRoles error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /applications/:applicationId
 * Auth: logged-in user. Verifies ownership (applicant must match authenticated user).
 * Populates applicant, openRole, and openRole.club.
 */
export async function getApplicationDetail(req: Request, res: Response) {
  try {
    const applicationId = req.params.applicationId as string;
    const userId = req.user!.sub;

    const app = await Application.findById(applicationId)
      .populate("applicant", "name email")
      .populate({
        path: "openRole",
        select: "jobTitle description applicationQuestions club deadline",
        populate: { path: "club", select: "name" },
      })
      .lean();

    if (!app) return res.status(404).json({ message: "Application not found" });

    // Allow access if: (a) user is the applicant, or (b) user is an exec of the role's club
    const applicantObj = app.applicant as unknown as { _id?: Types.ObjectId };
    const applicantId = applicantObj._id ? applicantObj._id.toString() : String(app.applicant);
    const isApplicant = applicantId === userId;

    let isExec = false;
    if (!isApplicant) {
      const roleObj = app.openRole as unknown as { club?: { _id?: Types.ObjectId } | Types.ObjectId };
      const clubId = roleObj?.club && typeof roleObj.club === "object" && "_id" in roleObj.club
        ? roleObj.club._id?.toString()
        : roleObj?.club?.toString();
      if (clubId) {
        const club = await Club.findById(clubId).lean();
        if (club) {
          isExec = club.execs.some((id) => id.toString() === userId)
            || club.admins.some((id) => id.toString() === userId);
        }
      }
    }

    if (!isApplicant && !isExec) {
      return res.status(403).json({ message: "You do not have access to this application" });
    }

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

/**
 * POST /applications
 * Auth: logged-in user (student).
 * Body: { openRoleId, answers }
 * answers is Record<string, string> mapping question text -> answer text.
 */
export async function submitApplication(req: Request, res: Response) {
  try {
    const applicantId = new Types.ObjectId(req.user!.sub);
    const { openRoleId, answers } = req.body as {
      openRoleId: string;
      answers: Record<string, string>;
    };

    if (!openRoleId) return res.status(400).json({ message: "openRoleId is required" });
    if (!answers || typeof answers !== "object") return res.status(400).json({ message: "answers is required" });

    const role = await OpenRole.findById(openRoleId);
    if (!role) return res.status(404).json({ message: "Open role not found" });

    // Prevent duplicate applications
    const existing = await Application.findOne({ openRole: role._id, applicant: applicantId });
    if (existing) return res.status(409).json({ message: "You have already applied for this role" });

    const app = await Application.create({
      _id: new Types.ObjectId(),
      openRole: role._id,
      applicant: applicantId,
      answers,
      status: ApplicationStatus.SUBMITTED,
    });

    const populated = await Application.findById(app._id)
      .populate("applicant", "name email")
      .populate("openRole", "jobTitle")
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    console.error("submitApplication error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}
