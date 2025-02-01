const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event', 
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    ticketType: {
        type: String,
        enum: ['Regular', 'VIP', 'VVIP'],
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    seatNumber: {
        type: String,
        required: false
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Cancelled'],
        default: 'Pending'
    },
    qrCode: {
        type: String,
        required: false 
    },
    purchasedAt: {
        type: Date,
        default: Date.now
    }
});

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
