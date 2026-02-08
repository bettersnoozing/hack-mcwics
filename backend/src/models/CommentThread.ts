import { Schema, model, Document, Types } from "mongoose";

export enum CommentThreadType {
	FORUM = "FORUM",
	REVIEW = "REVIEW",
}

export enum CommentThreadVisibility {
	PUBLIC = "PUBLIC",
	CLUB_APPLICANTS = "CLUB_APPLICANTS",
	CLUB_LEADERS = "CLUB_LEADERS",
}

export interface ICommentThread extends Document {
	_id: Types.ObjectId;
	type: CommentThreadType;
	clubId: Types.ObjectId;
	createdBy: Types.ObjectId;
	visibility: CommentThreadVisibility;
	locked: boolean;
	title?: string;
	application?: Types.ObjectId;
	commentCount: number;
}

const commentThreadSchema = new Schema<ICommentThread>(
	{
		type: {
			type: String,
			enum: Object.values(CommentThreadType),
			required: true,
		},
		clubId: { type: Types.ObjectId, ref: "Club", required: true },
		createdBy: { type: Types.ObjectId, ref: "User", required: true },
		visibility: {
			type: String,
			enum: Object.values(CommentThreadVisibility),
			required: true,
		},
		locked: { type: Boolean, default: false },
		title: { type: String, default: "" },
		application: { type: Types.ObjectId, ref: "Application" },
		commentCount: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

export const CommentThread = model<ICommentThread>(
	"CommentThread",
	commentThreadSchema
);
