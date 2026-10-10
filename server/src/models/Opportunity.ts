import { Schema, model } from "mongoose";

const opportunitySchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  capacity: {
    type: Number,
    default: 10,
    min: 1
  },
  skills: [String],
  latitude: {
    type: Number,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180
  },
  organizer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["open", "closed"],
    default: "open"
  }
}, {
  timestamps: true
});

export default model("Opportunity", opportunitySchema);
