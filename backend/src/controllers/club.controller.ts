import { Request, Response } from "express";
import { Types } from "mongoose";
import { Club } from "../models/Club.ts";
import { User, Role } from "../models/User.ts";

/**
 * GET /clubs
 */
export async function listClubs(_req: Request, res: Response) {
  try {
    const clubs = await Club.find().sort({ name: 1 }).lean();
    res.json(clubs);
  } catch (err) {
    console.error("listClubs error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /clubs/:clubId
 * Auth: logged-in user.
 * Returns a single club document (useful for verification and dashboards).
 */
export async function getClub(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;
    const club = await Club.findById(clubId).lean();
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.json(club);
  } catch (err) {
    console.error("getClub error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /clubs
 * Auth: any logged-in user.
 * Body: { name, description?, email?, website?, execPosition, bio?, profilePhotoUrl? }
 * Creates club, makes caller SUPERADMIN (admins[0] + execs), promotes to CLUB_LEADER.
 */
export async function createClub(req: Request, res: Response) {
  try {
    const userId = new Types.ObjectId(req.user!.sub);
    const { name, description, email, website, execPosition, bio, profilePhotoUrl } =
      req.body as {
        name: string;
        description?: string;
        email?: string;
        website?: string;
        execPosition: string;
        bio?: string;
        profilePhotoUrl?: string;
      };

    if (!name?.trim()) return res.status(400).json({ message: "Club name is required" });
    if (!execPosition?.trim()) return res.status(400).json({ message: "Your position/title is required" });

    const existing = await Club.findOne({ name: name.trim() });
    if (existing) return res.status(409).json({ message: "A club with that name already exists" });

    // Step 1: Create the club document
    const club = new Club({
      name: name.trim(),
      description: description?.trim() || "",
      admins: [userId],
      execs: [userId],
    });
    if (email?.trim()) club.email = email.trim();
    if (website?.trim()) club.website = website.trim();

    await club.save();
    console.log("Created club", club._id.toString());

    // Step 2: Update user to reference this club
    const userUpdate = await User.findByIdAndUpdate(userId, {
      $addToSet: { roles: Role.CLUB_LEADER },
      adminClub: club._id,
      execPosition: execPosition.trim(),
      bio: bio?.trim() || "",
      profilePhotoUrl: profilePhotoUrl?.trim() || "",
    }, { new: true });

    console.log("Updated user adminClub ->", club._id.toString(), "user:", userUpdate?._id.toString());

    // Step 3: Verify club was persisted (defensive check)
    const verify = await Club.findById(club._id).lean();
    if (!verify) {
      console.error("Club was not persisted! Rolling back user update.");
      await User.findByIdAndUpdate(userId, {
        $pull: { roles: Role.CLUB_LEADER },
        $unset: { adminClub: 1 },
        execPosition: "",
        bio: "",
        profilePhotoUrl: "",
      });
      return res.status(500).json({ message: "Club creation failed — document not persisted" });
    }

    res.status(201).json(club.toJSON());
  } catch (err) {
    console.error("createClub error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * PATCH /clubs/:clubId
 * Auth: approved exec (CLUB_LEADER whose id is in club.execs).
 */
export async function updateClub(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;
        const { description, email, website, tags } = req.body as {
          description?: string;
          email?: string;
          website?: string;
          tags?: string[];
    };

    const update: Record<string, unknown> = {};
    if (description !== undefined) update.description = description.trim();
    if (email !== undefined) update.email = email.trim();
    if (website !== undefined) update.website = website.trim();
        if (tags !== undefined) {
          if (!Array.isArray(tags)) {
            return res.status(400).json({ message: "Tags must be an array of strings" });
          }
          const cleanedTags = tags
            .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
            .filter((tag) => tag.length > 0);
          update.tags = Array.from(new Set(cleanedTags));
        }

    if (!Object.keys(update).length) return res.status(400).json({ message: "No fields to update" });

    const club = await Club.findByIdAndUpdate(clubId, update, { new: true }).lean();
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.json(club);
  } catch (err) {
    console.error("updateClub error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /clubs/:clubId/roster
 * Public — approved execs (users whose _id is in club.execs).
 */
export async function getRoster(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;
    const club = await Club.findById(clubId).lean();
    if (!club) return res.status(404).json({ message: "Club not found" });

    const users = await User.find({ _id: { $in: club.execs } })
      .select("_id name email execPosition bio profilePhotoUrl")
      .lean();

    const superAdminId = club.admins[0]?.toString();
    const roster = users.map((u) => ({
      userId: u._id,
      name: u.name,
      email: u.email,
      position: u.execPosition || "",
      bio: u.bio || "",
      profilePhotoUrl: u.profilePhotoUrl || "",
      isSuperAdmin: u._id.toString() === superAdminId,
    }));

    res.json(roster);
  } catch (err) {
    console.error("getRoster error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /clubs/:clubId/join
 * Auth: logged-in user.
 * Body: { execPosition, bio?, profilePhotoUrl? }
 * Sets user.adminClub but does NOT add to club.execs (pending state).
 */
export async function requestJoin(req: Request, res: Response) {
  try {
    const userId = new Types.ObjectId(req.user!.sub);
    const clubId = req.params.clubId as string;
    const { execPosition, bio, profilePhotoUrl } = req.body as {
      execPosition: string;
      bio?: string;
      profilePhotoUrl?: string;
    };

    if (!execPosition?.trim()) return res.status(400).json({ message: "Position/title is required" });

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });

    if (club.execs.some((id) => id.equals(userId))) {
      return res.status(409).json({ message: "You are already a member of this club" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.adminClub) {
      return res.status(409).json({ message: "You already have a pending or active club membership" });
    }

    user.adminClub = new Types.ObjectId(clubId);
    user.execPosition = execPosition.trim();
    user.bio = bio?.trim() || "";
    user.profilePhotoUrl = profilePhotoUrl?.trim() || "";
    await user.save();

    res.status(201).json({ message: "Join request submitted" });
  } catch (err) {
    console.error("requestJoin error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * GET /clubs/:clubId/join-requests
 * Auth: superadmin of this club.
 * Pending = users where adminClub == clubId AND _id NOT IN club.execs.
 */
export async function listJoinRequests(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;
    const club = await Club.findById(clubId).lean();
    if (!club) return res.status(404).json({ message: "Club not found" });

    const pending = await User.find({
      adminClub: new Types.ObjectId(clubId),
      _id: { $nin: club.execs },
    })
      .select("_id name email execPosition bio profilePhotoUrl")
      .lean();

    res.json(
      pending.map((u) => ({
        userId: u._id,
        name: u.name,
        email: u.email,
        position: u.execPosition || "",
        bio: u.bio || "",
        profilePhotoUrl: u.profilePhotoUrl || "",
      }))
    );
  } catch (err) {
    console.error("listJoinRequests error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /clubs/:clubId/join-requests/:userId/approve
 * Auth: superadmin.
 */
export async function approveJoinRequest(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;
    const targetUserId = req.params.userId as string;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });

    const user = await User.findById(targetUserId);
    if (!user || !user.adminClub || user.adminClub.toString() !== clubId) {
      return res.status(404).json({ message: "Pending request not found" });
    }
    if (club.execs.some((id) => id.equals(user._id))) {
      return res.status(409).json({ message: "User is already an exec" });
    }

    club.execs.push(user._id);
    await club.save();

    if (!user.roles.includes(Role.CLUB_LEADER)) {
      user.roles.push(Role.CLUB_LEADER);
    }
    await user.save();

    res.json({ message: "Request approved" });
  } catch (err) {
    console.error("approveJoinRequest error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * POST /clubs/:clubId/join-requests/:userId/reject
 * Auth: superadmin. Clears user's exec fields.
 */
export async function rejectJoinRequest(req: Request, res: Response) {
  try {
    const clubId = req.params.clubId as string;
    const targetUserId = req.params.userId as string;

    const user = await User.findById(targetUserId);
    if (!user || !user.adminClub || user.adminClub.toString() !== clubId) {
      return res.status(404).json({ message: "Pending request not found" });
    }

    await User.findByIdAndUpdate(targetUserId, {
      $unset: { adminClub: 1 },
      execPosition: "",
      bio: "",
      profilePhotoUrl: "",
    });

    res.json({ message: "Request rejected" });
  } catch (err) {
    console.error("rejectJoinRequest error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}

/**
 * PATCH /me/exec-profile
 * Auth: approved exec (CLUB_LEADER with adminClub set, and _id in club.execs).
 * Body: { execPosition?, bio?, profilePhotoUrl? }
 */
export async function updateExecProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const { execPosition, bio, profilePhotoUrl } = req.body as {
      execPosition?: string;
      bio?: string;
      profilePhotoUrl?: string;
    };

    const update: Record<string, string> = {};
    if (execPosition !== undefined) update.execPosition = execPosition.trim();
    if (bio !== undefined) update.bio = bio.trim();
    if (profilePhotoUrl !== undefined) update.profilePhotoUrl = profilePhotoUrl.trim();

    if (!Object.keys(update).length) return res.status(400).json({ message: "No fields to update" });

    const user = await User.findByIdAndUpdate(userId, update, { new: true })
      .select("_id name email execPosition bio profilePhotoUrl adminClub roles")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("updateExecProfile error:", err);
    res.status(500).json({ message: "Internal error" });
  }
}
