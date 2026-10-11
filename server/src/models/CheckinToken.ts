import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    opportunity: { type: Schema.Types.ObjectId, ref: "Opportunity", required: true },
    ngo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, default: 1 },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    history: [
      new Schema(
        { at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: "User" }, action: String, details: Schema.Types.Mixed },
        { _id: false }
      ),
    ],
  },
  { timestamps: true }
);

schema.index({ opportunity: 1 }, { unique: true });
schema.index({ tokenHash: 1 }, { unique: true });

export default model("CheckinToken", schema);