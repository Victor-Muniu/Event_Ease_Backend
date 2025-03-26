const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        unique: true
    },
    categories: {
        VVIP: {
            count: { type: Number, required: true, min: 0 },
            price: { type: Number, required: true, min: 0 } 
        },
        VIP: {
            count: { type: Number, required: true, min: 0 },
            price: { type: Number, required: true, min: 0 } 
        },
        Regular: {
            count: { type: Number, required: true, min: 0 },
            price: { type: Number, required: true, min: 0 } 
        }
    },
    totalTickets: { type: Number, required: true }
});

const Ticket = mongoose.model("Ticket", ticketSchema);
module.exports = Ticket;
