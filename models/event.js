const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true 
    },
    eventResponse: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'EventResponse', 
        required: true,
        unique: true 
    },
    venue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EventGround',
        required: true
    },
    eventOrganizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EventOrganizer',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    ticketsAvailable: {
        type: Number,
        required: true,
        min: 1
    },
    ticketPrice: {
        type: Number,
        required: true,
        min: 0
    },
    image: {
        type: String, 
        required: false
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Cancelled', 'Completed'],
        default: 'Approved'
    },
    staffManaging: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        default: null
    }
}, { timestamps: true });

EventSchema.pre('save', async function (next) {
    const existingEvent = await mongoose.model('Event').findOne({ eventResponse: this.eventResponse });

    if (existingEvent) {
        return next(new Error('An event has already been created for this response.'));
    }

    next();
});

const Event = mongoose.model('Event', EventSchema);

module.exports = Event;
