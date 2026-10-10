import { Schema, model } from "mongoose";

const userSchema = new Schema({
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["volunteer", "ngo", "admin"],
      default: "volunteer",
    },

    city: {
      type: String,
      default: "",
    },

    skills: [String],

    // Email verification
    emailVerified: {
      type: Boolean,
      default: true,
    },

    emailVerificationTokenHash: {
      type: String,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // Password reset
    passwordResetTokenHash: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // NGO public profile
    about: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    website: {
      type: String,
      default: "",
    },

    // Only an admin can change this (see setVerified)
    verified: {
      type: Boolean,
      default: false,
    },

    // Profile photo URL
    profilePhoto: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default model("User", userSchema);
