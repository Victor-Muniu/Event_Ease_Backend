const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: false,
    },
    type: {
        type: String,
        required: true,
        enum: ['Furniture', 'Electronics', 'Vehicles', 'Real Estate', 'Other'], 
    },
    purchaseDate: {
        type: Date,
        required: true,
    },
    cost: {
        type: Number,
        required: true,
    },
    location: {
        type: String, 
        required: true,
    },
    condition: {
        type: String,
        required: true,
        enum: ['New', 'Good', 'Fair', 'Poor', 'Damaged'], 
        default: 'Good',
    },
    status: {
        type: String,
        required: true,
        enum: ['In Use', 'In Storage', 'Under Maintenance', 'Disposed'], 
        default: 'In Use',
    },
    maintenanceHistory: [
        {
            date: {
                type: Date,
                required: true,
            },
            details: {
                type: String,
                required: true,
            },
            cost: {
                type: Number,
                required: false,
            },
        },
    ],
    images: [String], 
}, { timestamps: true });

const Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset;
