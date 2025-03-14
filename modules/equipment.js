const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    quantityAvailable: {
        type: Number,
        required: true,
        min: 0
    },
    rentalPricePerDay: {
        type: Number,
        required: true,
        min: 0
    },
    condition: {
        type: String,
        enum: ["New", "Good", "Fair", "Needs Repair"],
        default: "Good"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Equipment = mongoose.model("Equipment", equipmentSchema);
module.exports = Equipment;
