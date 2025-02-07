const mongoose = require("mongoose");

const eventRequestSchema = new mongoose.Schema({
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventOrganizer",
        required: true,
    },
    eventGround: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventGround",
        required: true,
    },
    eventDates: [
        {
            type: Date,
            required: true,
        },
    ],
    requestSubmissionDate: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
    expectedAttendees: {
        type: Number,
        required: true,
        min: 1,
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending",
    },
    additionalNotes: {
        type: String,
        trim: true,
        maxlength: 500,
    },
});

const EventRequest = mongoose.model("EventRequest", eventRequestSchema);
module.exports = EventRequest;
