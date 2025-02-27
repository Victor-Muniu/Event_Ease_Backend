const express = require("express");
const EventRequest = require("../models/eventGroundRequest");
const EventGround = require("../models/eventGround");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/event-requests", authMiddleware, async (req, res) => {
    try {
        const { eventGround, eventDates, expectedAttendees, additionalNotes } = req.body;

        if (!Array.isArray(eventDates) || eventDates.length === 0) {
            return res.status(400).json({ message: "Event dates are required and must be an array" });
        }

        const formattedEventDates = eventDates.map(date => new Date(date));

        const foundEventGround = await EventGround.findOne({ name: eventGround });
        if (!foundEventGround) {
            return res.status(404).json({ message: "Event ground not found" });
        }

        const eventRequest = new EventRequest({
            organizer: req.user._id,
            eventGround: foundEventGround._id,
            eventDates: formattedEventDates,
            expectedAttendees,
            additionalNotes
        });

        await eventRequest.save();
        res.status(201).json({ message: "Event request created successfully", eventRequest });
    } catch (err) {
        console.error("Error creating event request:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/event-requests", async (req, res) => {
    try {
        const eventRequests = await EventRequest.find()
            .populate("organizer", "firstName lastName email")
            .populate("eventGround", "name location");

        res.status(200).json(eventRequests);
    } catch (err) {
        console.error("Error fetching event requests:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/event-requests/ground/name/:eventGroundName", async (req, res) => {
    try {
        const { eventGroundName } = req.params;
        const foundEventGround = await EventGround.findOne({ name: eventGroundName });

        if (!foundEventGround) {
            return res.status(404).json({ message: "Event ground not found" });
        }

        const eventRequests = await EventRequest.find({ eventGround: foundEventGround._id })
            .populate("organizer", "firstName lastName email")
            .populate("eventGround", "name location");

        if (!eventRequests.length) {
            return res.status(404).json({ message: "No event requests found for this event ground" });
        }

        res.status(200).json(eventRequests);
    } catch (err) {
        console.error("Error fetching event requests by ground name:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.patch("/event-requests/:id", authMiddleware, async (req, res) => {
    try {
        const { status, additionalNotes } = req.body;
        const validStatuses = ["Pending", "Approved", "Rejected"];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const eventRequest = await EventRequest.findByIdAndUpdate(
            req.params.id,
            { status, additionalNotes },
            { new: true, runValidators: true }
        );

        if (!eventRequest) {
            return res.status(404).json({ message: "Event request not found" });
        }

        res.status(200).json({ message: "Event request updated successfully", eventRequest });
    } catch (err) {
        console.error("Error updating event request:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.delete("/event-requests/:id", authMiddleware, async (req, res) => {
    try {
        const eventRequest = await EventRequest.findByIdAndDelete(req.params.id);
        if (!eventRequest) {
            return res.status(404).json({ message: "Event request not found" });
        }

        res.status(200).json({ message: "Event request deleted successfully" });
    } catch (err) {
        console.error("Error deleting event request:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
