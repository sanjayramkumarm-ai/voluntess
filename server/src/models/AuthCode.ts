import { Schema, model } from "mongoose";

const authCodeSchema = new Schema({
  key: { type: String, required: true },
  purpose: { type: String, required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
});

authCodeSchema.index({ key: 1, purpose: 1 }, { unique: true });
// MongoDB deletes expired codes automatically
authCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("AuthCode", authCodeSchema);