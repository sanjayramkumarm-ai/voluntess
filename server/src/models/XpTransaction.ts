import { Schema, model } from "mongoose";

const xpTransactionSchema = new Schema(
  {
    volunteer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sourceType: {
      type: String,
      enum: ["application", "quest", "verified_activity"],
      required: true
    },
    sourceId: {
      type: String,
      required: true
    },
    points: {
      type: Number,
      required: true,
      min: 1
    },
    description: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate rewards for the same event.
xpTransactionSchema.index(
  { volunteer: 1, sourceType: 1, sourceId: 1 },
  { unique: true }
);

export default model("XpTransaction", xpTransactionSchema);
