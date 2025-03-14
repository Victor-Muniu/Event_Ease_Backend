const mongoose = require("mongoose");

const VenueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    location: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    pricePerDay: {
      type: Number,
      required: true,
    },
    amenities: {
      type: [String], 
      default: [],
    },
    availability: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
    },
    images: {
      type: [String], 
      default: [],
    },
  },
  { timestamps: true }
);

const Venue = mongoose.model("Venue", VenueSchema);
module.exports = Venue;
