const mongoose = require('mongoose');

const eventOrganizerSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^\S+@\S+\.\S+$/.test(v); 
            },
            message: props => `${props.value} is not a valid email!`,
        },
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^\d{10,15}$/.test(v); 
            },
            message: props => `${props.value} is not a valid phone number!`,
        },
    },
    password: {
        type: String,
        required: true,
        minlength: 8, 
        select: false, 
    },
    eventName: {
        type: String,
        required: false, 
        trim: true,
    },
    address: {
        type: String,
        required: false,
        trim: true,
    },
    verified: {
        type: Boolean,
        default: false, 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const EventOrganizer = mongoose.model('EventOrganizer', eventOrganizerSchema);

module.exports = EventOrganizer;
