import { Schema, model } from "mongoose";

const reviewSchema = new Schema(
  {
    application: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    opportunity: { type: Schema.Types.ObjectId, ref: "Opportunity", required: true },
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    direction: {
      type: String,
      enum: ["volunteer_to_ngo", "ngo_to_volunteer"],
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One review per side per application
reviewSchema.index({ application: 1, direction: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, direction: 1, createdAt: -1 });

export default model("Review", reviewSchema);