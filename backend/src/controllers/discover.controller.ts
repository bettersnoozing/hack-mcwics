import { Request, Response } from "express";
import { Types } from "mongoose";
import { Club } from "../models/Club.ts";
import { OpenRole } from "../models/OpenRole.ts";

/**
 * GET /discover/clubs
 * Public. Returns all clubs with computed isRecruiting and openRoleCount.
 */
export async function discoverClubs(_req: Request, res: Response) {
  try {
    const clubs = await Club.find().sort({ name: 1 }).lean();
    const now = new Date();

    // Batch-query all active open roles grouped by club
    const activeRoles = await OpenRole.aggregate([
      { $match: { deadline: { $gte: now } } },
      { $group: { _id: "$club", count: { $sum: 1 } } },
    ]);

    const roleCountMap = new Map<string, number>();
    for (const r of activeRoles) {
      roleCountMap.set(r._id.toString(), r.count);
    }

    const result = clubs.map((club) => {
      const id = club._id.toString();
      const openRoleCount = roleCountMap.get(id) ?? 0;
      return {
        _id: club._id,
        name: club.name,
        description: club.description ?? "",
        email: club.email,
        website: club.website,
        tags: club.tags ?? [],
        isRecruiting: openRoleCount > 0,
        openRoleCount,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("discoverClubs error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /discover/clubs/:clubId
 * Public. Returns club details + active open roles.
 */
export async function discoverClubDetail(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;
    const club = await Club.findById(clubId).lean();
    if (!club) return res.status(404).json({ message: "Club not found" });

    const now = new Date();
    const roles = await OpenRole.find({
      club: new Types.ObjectId(clubId),
      deadline: { $gte: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      _id: club._id,
      name: club.name,
      description: club.description ?? "",
      email: club.email,
      website: club.website,
      tags: club.tags ?? [],
      execs: club.execs,
      isRecruiting: roles.length > 0,
      openRoleCount: roles.length,
      openRoles: roles,
    });
  } catch (err) {
    console.error("discoverClubDetail error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /discover/open-roles?clubId=
 * Public. Returns active open roles, optionally filtered by clubId.
 */
export async function discoverOpenRoles(req: Request, res: Response) {
  try {
    const now = new Date();
    const filter: Record<string, unknown> = { deadline: { $gte: now } };

    const { clubId } = req.query;
    if (clubId && typeof clubId === "string") {
      filter.club = new Types.ObjectId(clubId);
    }

    const roles = await OpenRole.find(filter)
      .populate("club", "name")
      .sort({ deadline: 1 })
      .lean();

    res.json(roles);
  } catch (err) {
    console.error("discoverOpenRoles error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}
