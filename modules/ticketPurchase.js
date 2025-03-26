const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    response: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ticket",
        required: true
    },
    attendeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
        enum: ["Pending", "Confirmed", "Failed"],
        default: "Pending"
    },
    paymentDetails: {
        type: Array,
        default: [] // Initially an empty array
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
