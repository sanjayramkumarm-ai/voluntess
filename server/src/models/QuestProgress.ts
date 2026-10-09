import { Schema, model } from "mongoose";

const questProgressSchema = new Schema(
  {
    volunteer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    quest: {
      type: Schema.Types.ObjectId,
      ref: "Quest",
      required: true
    },
    periodKey: {
      type: String,
      required: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    rewardClaimed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// One progress record per volunteer, quest, and daily/weekly period.
questProgressSchema.index(
  { volunteer: 1, quest: 1, periodKey: 1 },
  { unique: true }
);

export default model("QuestProgress", questProgressSchema);
