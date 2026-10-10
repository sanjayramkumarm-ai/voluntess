import { Schema, model } from "mongoose";

const historySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const certificateSchema = new Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    volunteer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    opportunity: { type: Schema.Types.ObjectId, ref: "Opportunity", required: true },
    application: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    completion: { type: Schema.Types.ObjectId, ref: "Completion", required: true },
    ngo: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Immutable snapshot taken at issue time
    volunteerName: { type: String, required: true },
    ngoName: { type: String, required: true },
    opportunityTitle: { type: String, required: true },
    category: { type: String, default: "" },
    description: { type: String, default: "" },
    verifiedMinutesAtIssue: { type: Number, required: true, min: 1 },
    completionDate: { type: Date },
    issuedAt: { type: Date, default: Date.now },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    templateVersion: { type: Number, default: 1 },

    verificationStatus: { type: String, enum: ["valid", "revoked"], default: "valid" },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    revocationReasonCode: { type: String, default: "" },
    revocationNote: { type: String, default: "" },

    showNamePublicly: { type: Boolean, default: true },
    history: [historySchema],
  },
  { timestamps: true }
);

// Only one VALID certificate per application. Revoked ones don't block a reissue.
certificateSchema.index(
  { application: 1 },
  { unique: true, partialFilterExpression: { verificationStatus: "valid" } }
);
certificateSchema.index({ volunteer: 1, issuedAt: -1 });
certificateSchema.index({ ngo: 1, issuedAt: -1 });
certificateSchema.index({ opportunity: 1 });

export default model("Certificate", certificateSchema);