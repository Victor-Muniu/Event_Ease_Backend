const mongoose = require('mongoose');

const eventGroundSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    location: {
        type: {
            type: String,
            enum: ['Point'], // GeoJSON type must be "Point"
            required: true,
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        },
    },
    capacity: {
        type: Number,
        required: true,
        min: 1,
    },
    availability: {
        type: String,
        enum: ['Available', 'Booked', 'Under Maintenance'],
        default: 'Available',
    },
    pricePerDay: {
        type: Number,
        required: true,
        min: 0,
    },
    amenities: {
        type: [String], // Example: ['Restrooms', 'Parking', 'Lighting', 'Stage']
        default: [],
    },
    description: {
        type: String,
        trim: true,
    },
    images: {
        type: [String], // URLs to images of the ground
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Add 2dsphere index for geospatial queries
eventGroundSchema.index({ location: '2dsphere' });

eventGroundSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const EventGround = mongoose.model('EventGround', eventGroundSchema);

module.exports = EventGround;
