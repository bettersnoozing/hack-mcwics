// mongo model for user accounts table

import { Schema, model, Document, Types, CallbackWithoutResultAndOptionalError } from "mongoose";


// should consolidate this info to anther file so we use it in multiple places
export enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  CLUB_LEADER = "CLUB_LEADER",
}

// Valid uppercase role values
const VALID_ROLES = Object.values(Role);

export interface IUser extends Document {
  _id:  Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  roles: Role[];
  bio?: string;
  profilePhotoUrl?: string;
  adminClub?: Types.ObjectId;
  execPosition?: string;
  studentId?: string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    roles: {
      type: [String],

      enum: Object.values(Role),
      default: [Role.STUDENT],

    },
    bio: { type: String, default: "" },
    profilePhotoUrl: { type: String, default: "" },
    adminClub: { type: Schema.Types.ObjectId, ref: "Club" },
    execPosition: { type: String, default: "" },
    studentId: { type: String, default: "" },
  },
  { timestamps: true }
);

// Pre-validate hook to normalize roles to uppercase before validation runs
userSchema.pre('validate', function(next: CallbackWithoutResultAndOptionalError) {
  if (this.roles && Array.isArray(this.roles)) {
    this.roles = this.roles.map((role: string) => {
      const upper = role.toUpperCase();
      return VALID_ROLES.includes(upper as Role) ? upper as Role : role as Role;
    });
  }
  next();
});

export const User = model<IUser>("User", userSchema);
