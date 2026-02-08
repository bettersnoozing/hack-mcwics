import { Router } from "express";
import { register, registerAdmin, login, me, logout } from "../controllers/auth.controller.ts";
import { updateExecProfile } from "../controllers/club.controller.ts";
import { authenticate } from "../middleware/auth/authenticate.ts";

const authRouter = Router();

// Health check
authRouter.get("/", (_req, res) => {
  res.json({ status: "ok", message: "auth route up" });
});

// Auth endpoints
authRouter.post("/register", register);            // Default student signup
authRouter.post("/register/student", register);    // Explicit student signup
authRouter.post("/register/admin", registerAdmin); // Admin signup (requires key)
authRouter.post("/login", login);
authRouter.get("/me", authenticate, me);
authRouter.patch("/me/exec-profile", authenticate, updateExecProfile);
authRouter.post("/logout", logout);

// Backward-compatible aliases (old paths)
authRouter.post("/user/create", register);
authRouter.get("/user/me", authenticate, me);

export default authRouter;
