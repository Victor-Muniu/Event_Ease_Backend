const mongoose = require('mongoose');
const EventRequest = require('../models/eventGroundRequest');
const EventGround = require('../models/eventGround');

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
            return 'QTN-' + Math.floor(1000 + Math.random() * 9000);
        }
    },
    totalPrice: {
        type: Number
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Deposit Paid', 'Fully Paid'],
        default: 'Pending'
    }
}, { timestamps: true });


responseSchema.methods.calculateTotalPrice = async function() {
    try {
        const eventRequest = await EventRequest.findById(this.eventRequest).populate('eventGround');
        if (!eventRequest || !eventRequest.eventGround) {
            throw new Error('Event request or event ground not found');
        }

        const eventGround = eventRequest.eventGround;
        const days = eventRequest.eventDates.length;
        return eventGround.pricePerDay * days;
    } catch (error) {
        throw new Error(error.message);
    }
};

responseSchema.methods.generateResponseMessage = async function() {
    try {
        const eventRequest = await EventRequest.findById(this.eventRequest).populate('eventGround');
        if (!eventRequest || !eventRequest.eventGround) {
            throw new Error('Event request or event ground not found');
        }

        const eventGround = eventRequest.eventGround;
        const days = eventRequest.eventDates.length;
        const totalPrice = await this.calculateTotalPrice();

        const message = `
            Dear ${eventRequest.organizer.firstName} ${eventRequest.organizer.lastName},

            Thank you for your request to book the event space at ${eventGround.name}. We are pleased to provide the following quotation for your consideration:

            Event Details:
            - Event Dates: ${eventRequest.eventDates.join(', ')}
            - Expected Attendees: ${eventRequest.expectedAttendees}
            - Additional Notes: ${eventRequest.additionalNotes || 'N/A'}

            Event Ground Details:
            - Venue: ${eventGround.name}
            - Location: ${eventGround.location}
            - Price Per Day: ${eventGround.pricePerDay} USD

            Total Days: ${days}
            Total Price: ${totalPrice} USD

            Payment Status: ${this.paymentStatus}

            Terms and Conditions:
            ${this.termsAndConditions || 'Please confirm your booking within 7 days.'}

            Should you have any questions or wish to proceed with this quotation, please do not hesitate to contact us.

            Best regards,
            ${this.respondedBy.firstName} ${this.respondedBy.lastName}
            Event Manager
            Event Coordination Team
        `;

        return message;
    } catch (error) {
        throw new Error(error.message);
    }
};

const EventResponse = mongoose.model('EventResponse', responseSchema);
module.exports = EventResponse;
