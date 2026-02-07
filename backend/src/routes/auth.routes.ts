// auth routes

import { Router } from "express";
import bcrypt from "bcrypt";
import { User, Role } from "../models/User.ts";
import { signToken } from "../utils/jwt.ts";
import { authenticate } from "../middleware/auth/authenticate.ts";
import { authorize } from "../middleware/auth/authorize.ts";
import { Types } from "mongoose";

const authRouter = Router();

// GET /auth
authRouter.get("/", (_req, res) => {
  res.json({ status: "ok", message: "auth route up" });
});

// POST /auth/user/create
authRouter.post("/user/create", async (req, res) => { // should move much of this to create user middleware
  try {
    const { email, password, roles } = req.body as {
      email: string;
      password: string;
      roles?: Role[];
    };

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ // should probably create mongo utils to handle all interactions with the db instead of making a direct call here
      _id: new Types.ObjectId(),
      email,
      passwordHash,
      roles: roles && roles.length ? roles : [Role.USER],
    });

    const token = signToken({ sub: user._id.toString(), roles: user.roles }); // token signed, authention done

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, roles: user.roles },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal error" });
  }
});

// POST /auth/login
authRouter.post("/login", async (req, res) => { // should move much of this to login middleware
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ sub: user.id, roles: user.roles });

    res.json({
      token,
      user: { id: user.id, email: user.email, roles: user.roles },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /auth/user/me
authRouter.get("/user/me", authenticate, async (req, res) => {
  const id = req.user!.sub;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ id: user._id, email: user.email, roles: user.roles });
});

// // Example role-protected route
// router.get(
//   "/admin/dashboard",
//   authenticate,
//   authorize([Role.ADMIN]),
//   async (req, res) => {
//     res.json({ message: "Admin-only data" });
//   }
// );

export default authRouter;
