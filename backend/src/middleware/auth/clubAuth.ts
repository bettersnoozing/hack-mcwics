import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Club } from "../../models/Club.ts";

/**
 * Require caller is an approved exec of :clubId
 * (their _id must appear in club.execs).
 */
export function requireApprovedExec(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const clubId = req.params.clubId as string;
  if (!clubId) return res.status(400).json({ message: "clubId param required" });

  Club.findById(clubId)
    .lean()
    .then((club) => {
      if (!club) return res.status(404).json({ message: "Club not found" });
      const isExec = club.execs.some((id) => id.toString() === req.user!.sub);
      if (!isExec) return res.status(403).json({ message: "Not an approved exec of this club" });
      next();
    })
    .catch((err) => {
      console.error("requireApprovedExec error:", err);
      res.status(500).json({ message: "Internal error" });
    });
}

/**
 * Require caller is the SUPERADMIN of :clubId
 * (admins[0] === caller's userId).
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const clubId = req.params.clubId as string;
  if (!clubId) return res.status(400).json({ message: "clubId param required" });

  Club.findById(clubId)
    .lean()
    .then((club) => {
      if (!club) return res.status(404).json({ message: "Club not found" });
      if (!club.admins[0] || club.admins[0].toString() !== req.user!.sub) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      next();
    })
    .catch((err) => {
      console.error("requireSuperAdmin error:", err);
      res.status(500).json({ message: "Internal error" });
    });
}
