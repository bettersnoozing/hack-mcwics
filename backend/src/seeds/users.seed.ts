import mongoose, { Types } from "mongoose";
import bcrypt from "bcrypt";
import config from "../config/config.ts";
import { BCRYPT_ROUNDS } from "../config/auth.ts";
import { User, Role } from "../models/User.ts";

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@mcgill.ca";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Portal Admin";

async function seed() {
  try {
    await mongoose.connect(config.mongoURI, { dbName: config.mongoDbName });
    console.log("Connected to Mongo for seeding");

    // Idempotent: only create if not present
    const existing = await User.findOne({ email: SEED_ADMIN_EMAIL });
    if (existing) {
      console.log(`Admin user already exists: ${SEED_ADMIN_EMAIL}`);
    } else {
      const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, BCRYPT_ROUNDS);
      await User.create({
        _id: new Types.ObjectId(),
        email: SEED_ADMIN_EMAIL,
        name: SEED_ADMIN_NAME,
        passwordHash,
        roles: [Role.ADMIN],
      });
      console.log(`Created admin user: ${SEED_ADMIN_EMAIL}`);
    }

    // Migrate legacy USER roles to STUDENT
    const migrated = await User.updateMany(
      { roles: "USER" },
      { $set: { "roles.$[elem]": Role.STUDENT } },
      { arrayFilters: [{ elem: "USER" }] }
    );
    if (migrated.modifiedCount > 0) {
      console.log(`Migrated ${migrated.modifiedCount} user(s) from USER -> STUDENT role`);
    }

    await mongoose.disconnect();
    console.log("Seed complete");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
