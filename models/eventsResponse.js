const mongoose = require('mongoose');
const EventGround = require('./eventGround'); 

const responseSchema = new mongoose.Schema({
    eventRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EventRequest',
        required: true,
    },
    responseMessage: {
        type: String,
        required: true,
    },
    respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
    },
    quotationNumber: {
        type: String,
        required: true,
        unique: true,
        default: function() {
            // Generate a unique quotation number (e.g., "QTN-XXXX")
            return 'QTN-' + Math.floor(1000 + Math.random() * 9000);
        }
    },
    totalPrice: {
        type: Number
    },
}, { timestamps: true });

// Method to calculate the total price for the event response
responseSchema.methods.calculateTotalPrice = function(eventRequest) {
    const eventGround = eventRequest.eventGround;

    // Calculate the price based on the number of event days
    const days = eventRequest.eventDates.length;
    const pricePerDay = eventGround.pricePerDay;
    
    return pricePerDay * days;
};


const EventResponse = mongoose.model('EventResponse', responseSchema);
module.exports = EventResponse;
