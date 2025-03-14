const express = require("express");
const Venue = require("../modules/venue"); 
const authMiddleware = require("../middleware/staffMiddleware");
const router = express.Router();

router.post("/venues",authMiddleware, async (req, res) => {
    try {
        const venue = new Venue(req.body);
        await venue.save();
        res.status(201).json({ message: "Venue created successfully", venue });
    } catch (err) {
        console.error("Error creating venue:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/venues", async (req, res) => {
    try {
        const venues = await Venue.find();
        res.status(200).json(venues);
    } catch (err) {
        console.error("Error fetching venues:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/venues/:id", async (req, res) => {
    try {
        const venue = await Venue.findById(req.params.id);
        if (!venue) {
            return res.status(404).json({ message: "Venue not found" });
        }
        res.status(200).json(venue);
    } catch (err) {
        console.error("Error fetching venue:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.patch("/venues/:id",authMiddleware, async (req, res) => {
    try {
        const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!venue) {
            return res.status(404).json({ message: "Venue not found" });
        }
        res.status(200).json({ message: "Venue updated successfully", venue });
    } catch (err) {
        console.error("Error updating venue:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.delete("/venues/:id", authMiddleware, async (req, res) => {
    try {
        const venue = await Venue.findByIdAndDelete(req.params.id);
        if (!venue) {
            return res.status(404).json({ message: "Venue not found" });
        }
        res.status(200).json({ message: "Venue deleted successfully" });
    } catch (err) {
        console.error("Error deleting venue:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
