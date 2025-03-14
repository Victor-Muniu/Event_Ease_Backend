const express = require("express");
const Equipment = require("../modules/equipment");
const authMiddleware = require("../middleware/staffMiddleware");

const router = express.Router();

router.post("/equipment", authMiddleware, async (req, res) => {
    try {
        const { name, category, description, quantityAvailable, rentalPricePerDay, condition } = req.body;

        const newEquipment = new Equipment({
            name,
            category,
            description,
            quantityAvailable,
            rentalPricePerDay,
            condition,
        });

        await newEquipment.save();
        res.status(201).json({ message: "Equipment added successfully", equipment: newEquipment });

    } catch (err) {
        console.error("Error adding equipment:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/equipment", async (req, res) => {
    try {
        const equipmentList = await Equipment.find();
        res.status(200).json(equipmentList);
    } catch (err) {
        console.error("Error fetching equipment:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.get("/equipment/:id", async (req, res) => {
    try {
        const equipment = await Equipment.findById(req.params.id).populate("owner", "fname lname email");
        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }
        res.status(200).json(equipment);
    } catch (err) {
        console.error("Error fetching equipment:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.patch("/equipment/:id", authMiddleware, async (req, res) => {
    try {
        const updates = req.body;
        const equipment = await Equipment.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }
        res.status(200).json({ message: "Equipment updated successfully", equipment });

    } catch (err) {
        console.error("Error updating equipment:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.delete("/equipment/:id", authMiddleware, async (req, res) => {
    try {
        const equipment = await Equipment.findByIdAndDelete(req.params.id);
        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found" });
        }
        res.status(200).json({ message: "Equipment deleted successfully" });

    } catch (err) {
        console.error("Error deleting equipment:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
