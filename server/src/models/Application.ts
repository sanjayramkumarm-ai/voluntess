import { Schema, model } from "mongoose";

const applicationSchema = new Schema({
  volunteer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  opportunity: {
    type: Schema.Types.ObjectId,
    ref: "Opportunity",
    required: true
  },
  message: {
    type: String,
    default: ""
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: "Team",
    default: null
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "withdrawn"],
    default: "pending"
  }
}, {
  timestamps: true
});

applicationSchema.index(
  { volunteer: 1, opportunity: 1 },
  { unique: true }
);

export default model("Application", applicationSchema);
