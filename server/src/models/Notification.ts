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
      enum: ["application_accepted", "application_rejected"],
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