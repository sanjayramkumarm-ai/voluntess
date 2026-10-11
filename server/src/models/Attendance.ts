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

const attendanceSchema = new Schema(
  {
    volunteer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    opportunity: { type: Schema.Types.ObjectId, ref: "Opportunity", required: true },
    application: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    ngo: { type: Schema.Types.ObjectId, ref: "User", required: true },

    volunteerName: { type: String, default: "" },
    opportunityTitle: { type: String, default: "" },
    ngoName: { type: String, default: "" },

    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date, default: null },
    status: { type: String, enum: ["checked_in", "checked_out"], default: "checked_in" },
    verification: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },

    provisionalMinutes: { type: Number, default: 0, min: 0 },
    approvedMinutes: { type: Number, default: 0, min: 0 },
    reviewReason: { type: String, default: "", maxlength: 300 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },

    flags: [{ type: String }],
    via: { type: String, enum: ["qr", "manual"], default: "qr" },
    history: [historySchema],
  },
  { timestamps: true }
);

// One record per application, and only ONE active session per volunteer
attendanceSchema.index({ application: 1 }, { unique: true });
attendanceSchema.index({ volunteer: 1 }, { unique: true, partialFilterExpression: { status: "checked_in" } });
attendanceSchema.index({ opportunity: 1, status: 1 });
attendanceSchema.index({ volunteer: 1, checkInAt: -1 });
attendanceSchema.index({ ngo: 1, verification: 1 });

export default model("Attendance", attendanceSchema);