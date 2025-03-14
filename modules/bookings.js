const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
    response: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VenueRequestResponse",
        required: true
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventOrganizer",
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["Tentative", "Confirmed", "Cancelled"],
        default: "Tentative"
    },
    paymentDetails: [
        {
            amount: Number,
            paymentMethod: { type: String, enum: ["M-Pesa", "PayPal"] },
            transactionId: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-update status when amount is fully paid
BookingSchema.pre("save", function (next) {
    if (this.amountPaid >= this.totalAmount) {
        this.status = "Confirmed"; // ✅ Capitalized correctly
    } else {
        this.status = "Tentative"; // ✅ Capitalized correctly
    }
    next();
});


const Booking = mongoose.model("Booking", BookingSchema);
module.exports = Booking;
