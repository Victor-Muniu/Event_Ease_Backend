const mongoose = require("mongoose");

const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const EventOrganizerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    organizationName: { type: String, required: true },
    address: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: generateVerificationCode }, 
  },
  { timestamps: true }
);

const EventOrganizer = mongoose.model("EventOrganizer", EventOrganizerSchema);
module.exports = EventOrganizer;
