const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ["Upcoming", "Ongoing","Completed"],
        default: "Upcoming"
    }
});

const Event = mongoose.model("Event", eventSchema)
module.exports = Event
