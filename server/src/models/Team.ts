import { Schema, model } from "mongoose";

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    leader: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    inviteCode: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

teamSchema.index({ members: 1 });
teamSchema.index({ leader: 1 });

export default model("Team", teamSchema);