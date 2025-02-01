const mongoose = require("mongoose");

const eventRequestSchema = new mongoose.Schema({
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventOrganizer", 
        required: true
    },
    eventGround: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventGround", 
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
    eventDates: [
        {
            type: Date,
            required: true
        }
    ],
    expectedAttendance: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    requestDate: {
        type: Date,
        default: Date.now
    }
});

const EventRequest = mongoose.model("EventRequest", eventRequestSchema);
module.exports = EventRequest;
