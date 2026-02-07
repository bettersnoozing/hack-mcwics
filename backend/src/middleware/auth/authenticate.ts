// authenticating that the user is logged in and is valid.
// only authentication to the site as a whole, not authorization for specific paths
// ensures valid token is presented at login

// following RBAC auth pattern, this is first layer.
// (role based access control)

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../utils/jwt.ts";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid auth header" });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifyToken(token); // once verified, req.user is set and can be used for access control
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
