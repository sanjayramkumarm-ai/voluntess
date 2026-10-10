import { Schema, model } from "mongoose";

const historySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    fromStatus: { type: String },
    toStatus: { type: String },
    details: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const completionSchema = new Schema(
  {
    volunteer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    opportunity: { type: Schema.Types.ObjectId, ref: "Opportunity", required: true },
    application: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    ngo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    eventDate: { type: Date },
    actualStart: { type: Date, default: null },
    actualEnd: { type: Date, default: null },
    submittedMinutes: { type: Number, default: 0, min: 0 },
    verifiedMinutes: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["attendance_recorded", "completion_pending", "verified", "rejected"],
      default: "attendance_recorded",
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    completionNotes: { type: String, default: "", maxlength: 500 },
    rejectionReason: { type: String, default: "", maxlength: 300 },
    opportunityTitle: { type: String, default: "" },
    ngoName: { type: String, default: "" },
    category: { type: String, default: "" },
    history: [historySchema],
  },
  { timestamps: true }
);

completionSchema.index({ application: 1 }, { unique: true });
completionSchema.index({ volunteer: 1, status: 1, eventDate: -1 });
completionSchema.index({ ngo: 1, status: 1 });
completionSchema.index({ opportunity: 1 });

export default model("Completion", completionSchema);