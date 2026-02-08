import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Types } from "mongoose";
import { User, Role } from "../models/User.ts";
import { signToken } from "../utils/jwt.ts";
import { BCRYPT_ROUNDS } from "../config/auth.ts";

const ADMIN_SIGNUP_KEY = process.env.ADMIN_SIGNUP_KEY || "";

// Reject requests that contain fields not in the allowed set.
function rejectUnknownFields(
  body: Record<string, unknown>,
  allowed: string[]
): string | null {
  const unknown = Object.keys(body).filter((k) => !allowed.includes(k));
  if (unknown.length > 0) return `Unknown field(s): ${unknown.join(", ")}`;
  return null;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

async function createUser(
  email: string,
  password: string,
  name: string | undefined,
  roles: Role[]
) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const displayName = name ?? email.split("@")[0] ?? email;
  return User.create({
    _id: new Types.ObjectId(),
    email,
    name: displayName,
    passwordHash,
    roles,
  });
}

function userResponse(user: InstanceType<typeof User>) {
  const token = signToken({ sub: user._id.toString(), roles: user.roles });
  return {
    token,
    user: { id: user._id, email: user.email, name: user.name, roles: user.roles },
  };
}

/**
 * POST /auth/register (alias for student signup, backwards compatible)
 * POST /auth/register/student
 * Body: { email, password, name? }
 * Returns: { token, user }
 * Always assigns STUDENT role. Client-supplied `roles` is rejected.
 */
export async function register(req: Request, res: Response) {
  try {
    const bad = rejectUnknownFields(req.body, ["email", "password", "name"]);
    if (bad) return res.status(400).json({ message: bad });

    const { email, password, name } = req.body as {
      email: string;
      password: string;
      name?: string;
    };

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({ message: "name must be a string" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await createUser(email, password, name, [Role.STUDENT]);
    res.status(201).json(userResponse(user));
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /auth/register/admin
 * Body: { email, password, name?, adminKey }
 * Returns: { token, user }
 * Requires ADMIN_SIGNUP_KEY to create admin accounts.
 */
export async function registerAdmin(req: Request, res: Response) {
  try {
    const bad = rejectUnknownFields(req.body, ["email", "password", "name", "adminKey"]);
    if (bad) return res.status(400).json({ message: bad });

    const { email, password, name, adminKey } = req.body as {
      email: string;
      password: string;
      name?: string;
      adminKey?: string;
    };

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!ADMIN_SIGNUP_KEY) {
      return res.status(403).json({ message: "Admin signup is not configured" });
    }

    if (!adminKey || adminKey !== ADMIN_SIGNUP_KEY) {
      return res.status(403).json({ message: "Invalid admin signup key" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await createUser(email, password, name, [Role.ADMIN]);
    res.status(201).json(userResponse(user));
  } catch (err) {
    console.error("registerAdmin error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /auth/login
 * Body: { email, password }
 * Returns: { token, user }
 */
export async function login(req: Request, res: Response) {
  try {
    const bad = rejectUnknownFields(req.body, ["email", "password"]);
    if (bad) return res.status(400).json({ message: bad });

    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ sub: user._id.toString(), roles: user.roles });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        adminClub: user.adminClub || null,
        execPosition: user.execPosition || "",
        bio: user.bio || "",
        profilePhotoUrl: user.profilePhotoUrl || "",
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /auth/me
 * Requires: Bearer token (authenticate middleware)
 * Returns: { id, email, name, roles }
 */
export async function me(req: Request, res: Response) {
  try {
    const id = req.user!.sub;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      adminClub: user.adminClub || null,
      execPosition: user.execPosition || "",
      bio: user.bio || "",
      profilePhotoUrl: user.profilePhotoUrl || "",
    });
  } catch (err) {
    console.error("me error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /auth/logout
 * No-op for JWT (client discards token). Included for API completeness.
 */
export function logout(_req: Request, res: Response) {
  res.json({ message: "Logged out" });
}
