const mongoose = require("mongoose");
const QRCode = require("qrcode");

const ticketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true
    },
    ticketType: {
        type: String,
        enum: ["Regular", "VIP", "VVIP"],
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, "You must buy at least one ticket"]
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, "Total amount must be greater than zero"]
    },
    paymentMethod: {
        type: String,
        enum: ["M-Pesa", "PayPal"],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending"
    },
    qrCode: {
        type: String
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    }
});

ticketSchema.pre("save", async function (next) {
    if (this.paymentStatus === "Paid" && !this.qrCode) {
        try {
            const qrData = `User: ${this.user}, Event: ${this.event}, Ticket Type: ${this.ticketType}, Quantity: ${this.quantity}`;
            this.qrCode = await QRCode.toDataURL(qrData);
        } catch (err) {
            return next(err);
        }
    }
    next();
});

const Ticket = mongoose.model("Ticket", ticketSchema);
module.exports = Ticket;
