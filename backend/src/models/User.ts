// mongo model for user accounts table

import { Schema, model, Document, Types } from "mongoose";


// should consolidate this info to anther file so we use it in multiple places
export enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  CLUB_LEADER = "CLUB_LEADER",
}

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

export const User = model<IUser>("User", userSchema);
