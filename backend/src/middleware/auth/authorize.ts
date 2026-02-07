import { Request, Response, NextFunction } from "express";
import { Role } from "../../models/User.ts";


// authorizes that user has proper roles to access a route
// called next in auth chain after authentication
// second layer in RBAC auth

// called when a route requires specific perms
// usage: ex. authorize([Role.STUDENT]) to check if user has student role
// throws 4XX http errors on failure, on success just continues to next in call stack

export function authorize(required: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const hasRole = req.user.roles.some((r) => required.includes(r));
    if (!hasRole) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
