import { Schema, model, Document, Types } from "mongoose";

export interface IComment extends Document {
	_id: Types.ObjectId;
	threadId: Types.ObjectId;
	parentId?: Types.ObjectId | null;
	author: Types.ObjectId;
	body: string;
	deleted: boolean;
	stars?: number;
}

const commentSchema = new Schema<IComment>(
	{
		threadId: { type: Types.ObjectId, ref: "CommentThread", required: true },
		parentId: { type: Types.ObjectId, ref: "Comment", default: null },
		author: { type: Types.ObjectId, ref: "User", required: true },
		body: { type: String, required: true },
		deleted: { type: Boolean, default: false },
		stars: { type: Number, min: 1, max: 5 },
	},
	{ timestamps: true }
);

export const Comment = model<IComment>("Comment", commentSchema);