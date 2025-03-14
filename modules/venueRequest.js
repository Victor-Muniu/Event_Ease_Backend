const mongoose = require("mongoose");

const VenueRequestSchema = new mongoose.Schema({
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventOrganizer",
        required: true
    },
    venue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Venue",
        required: true
    },
    eventName: {
        type: String,
        required: true
    },
    eventDescription: {
        type: String,
        required: true
    },
    eventDates: {
        type: [Date],
        required: true
    },
    expectedAttendance: {
        type: Number,
        required: true
    },
    additionalRequests: {
        type: String
    },
    requestDate: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    }
});

const VenueRequest = mongoose.model("VenueRequest", VenueRequestSchema);
module.exports = VenueRequest;