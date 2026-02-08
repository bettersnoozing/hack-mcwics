import { Request, Response, NextFunction } from "express";
import { OpenRole } from "../../models/OpenRole.ts";
import { Club } from "../../models/Club.ts";

/**
 * For routes like /open-roles/:openRoleId — look up the role's club
 * and verify the caller is an approved exec of that club.
 */
export function requireOpenRoleExec(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const openRoleId = req.params.openRoleId as string;
  if (!openRoleId) return res.status(400).json({ message: "openRoleId param required" });

  OpenRole.findById(openRoleId)
    .lean()
    .then((role) => {
      if (!role) return res.status(404).json({ message: "Open role not found" });
      return Club.findById(role.club).lean().then((club) => {
        if (!club) return res.status(404).json({ message: "Club not found" });
        const isExec = club.execs.some((id) => id.toString() === req.user!.sub);
        if (!isExec) return res.status(403).json({ message: "Not an approved exec of this club" });
        next();
      });
    })
    .catch((err) => {
      console.error("requireOpenRoleExec error:", err);
      res.status(500).json({ message: "Internal error" });
    });
}
