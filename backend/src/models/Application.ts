import { Schema, model, Document, Types } from "mongoose";

export enum ApplicationStatus {
	SUBMITTED = "SUBMITTED",
	UNDER_REVIEW = "UNDER_REVIEW",
	ACCEPTED = "ACCEPTED",
	REJECTED = "REJECTED",
	WITHDRAWN = "WITHDRAWN",
}

export interface IApplication extends Document {
	_id: Types.ObjectId;
	openRole: Types.ObjectId; // link to the OpenRole being applied for
	applicant: Types.ObjectId; // link to the User who applied
	answers: {}; // answers to application questions
	status: ApplicationStatus;
}

const applicationSchema = new Schema<IApplication>(
	{
		openRole: { type: Schema.Types.ObjectId, ref: "OpenRole", required: true },
		applicant: { type: Schema.Types.ObjectId, ref: "User", required: true },
		answers: { type: {}, default: {} }, // map of questions frm the openRole object to answers
		status: {
			type: String,
			enum: Object.values(ApplicationStatus),
			default: ApplicationStatus.SUBMITTED,
		},
	},
	{ timestamps: true }
);

export const Application = model<IApplication>("Application", applicationSchema);
