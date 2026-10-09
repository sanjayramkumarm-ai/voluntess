import { Schema, model } from "mongoose";

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ["volunteer", "ngo", "admin"],
    default: "volunteer"
  },
  city: {
    type: String,
    default: ""
  },
  skills: [String]
}, {
  timestamps: true
});

export default model("User", userSchema);
