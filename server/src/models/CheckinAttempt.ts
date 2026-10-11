import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    opportunity: { type: Schema.Types.ObjectId, ref: "Opportunity", default: null },
    volunteer: { type: Schema.Types.ObjectId, ref: "User", default: null },
    application: { type: Schema.Types.ObjectId, ref: "Application", default: null },
    type: { type: String, required: true },
    severity: { type: String, enum: ["info", "review"], default: "info" },
    message: { type: String, default: "" },
    reviewed: { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schema.index({ opportunity: 1, severity: 1, reviewed: 1, createdAt: -1 });
schema.index({ volunteer: 1, type: 1, createdAt: -1 });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export default model("CheckinAttempt", schema);