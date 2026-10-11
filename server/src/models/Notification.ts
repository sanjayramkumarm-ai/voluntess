import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: [
        "new_message",
        "application_accepted",
        "application_rejected",
        "application_withdrawn",
        "certificate_issued",
        "attendance_recorded",
        "hours_review_needed",
        "hours_approved",
        "hours_rejected"
      ],
      required: true
    },

    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    relatedApplication: {
      type: Schema.Types.ObjectId,
      ref: "Application"
    },

    relatedOpportunity: {
      type: Schema.Types.ObjectId,
      ref: "Opportunity"
    },

    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Notification", notificationSchema);