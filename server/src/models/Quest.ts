import { Schema, model } from "mongoose";

const questSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    period: {
      type: String,
      enum: ["daily", "weekly"],
      required: true
    },
    action: {
      type: String,
      enum: [
        "apply_opportunity",
        "accepted_application",
        "verified_activity"
      ],
      required: true
    },
    target: {
      type: Number,
      required: true,
      min: 1
    },
    rewardXp: {
      type: Number,
      required: true,
      min: 1
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default model("Quest", questSchema);
