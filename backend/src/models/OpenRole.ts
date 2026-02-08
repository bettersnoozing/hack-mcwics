import { Schema, model, Document, Types } from "mongoose";

export interface IOpenRole extends Document {
	_id: Types.ObjectId;
	club: Types.ObjectId;
	jobTitle: string;
	description: string;
	deadline: Date;
	applicationQuestions: string[];
}

const openRoleSchema = new Schema<IOpenRole>(
	{
		club: { type: Schema.Types.ObjectId, ref: "Club", required: true },
		jobTitle: { type: String, required: true },
		description: { type: String, required: true },
		deadline: { type: Date, required: true },
		applicationQuestions: { type: [String], default: [] },
	},
	{ timestamps: true }
);

export const OpenRole = model<IOpenRole>("OpenRole", openRoleSchema);
