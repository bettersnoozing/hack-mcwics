import { Schema, model, Document, Types } from "mongoose";

export interface IClub extends Document {
	_id: Types.ObjectId;
	name: string;
	description?: string;
	email?: string;
	website?: string;
	execs: Types.ObjectId[];
    admins: Types.ObjectId[]; // club leaders with admin privileges
    openRoles?: Types.ObjectId[]; // open exec positions
    discussionForumId?: Types.ObjectId; // optional reference to a discussion forum
}

const clubSchema = new Schema<IClub>(
	{
		name: { type: String, required: true, unique: true },
		description: { type: String, default: "" },
		email: { type: String, lowercase: true },
		website: { type: String },
		execs: [{ type: Types.ObjectId, ref: "User", default: [] }],
        openRoles: [{ type: Types.ObjectId, ref: "OpenRole", default: [] }],
        admins: [{ type: Types.ObjectId, ref: "User", default: [] }],
        discussionForumId: { type: Types.ObjectId, ref: "DiscussionForum" },
	},
	{ timestamps: true }
);

export const Club = model<IClub>("Club", clubSchema);

