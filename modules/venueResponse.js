const mongoose = require("mongoose");

const VenueRequestResponseSchema = new mongoose.Schema({
    venueRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VenueRequest",
        required: true
    },
    dailyRates: [
        {
            date: {
                type: Date,
                required: true
            },
            price: {
                type: Number,
                required: true
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const VenueRequestResponse = mongoose.model("VenueRequestResponse", VenueRequestResponseSchema);
module.exports = VenueRequestResponse
