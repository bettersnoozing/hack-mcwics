// augment the default express request type to include user info
// needed for authentication with JWT

// based on this stack overflow thread https://stackoverflow.com/questions/37377731/extend-express-request-object-using-typescript

export {};

import type { Role } from "../models/User.js";

export interface JwtPayload {
  sub: string;
  roles: Role[];
}

// Declaration merging: extend Express.Request everywhere
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}



