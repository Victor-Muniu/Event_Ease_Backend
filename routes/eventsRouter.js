const express = require("express");
const Event = require("../models/event");
const EventResponse = require("../models/eventsResponse");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.post("/events", authMiddleware, async (req, res) => {
    try {
        const { name, eventResponse, startDate, endDate, ticketsAvailable, ticketPrice, image } = req.body;

        // Validate Event Response
        const response = await EventResponse.findById(eventResponse).populate("eventRequest");
        if (!response) {
            return res.status(404).json({ message: "Event response not found" });
        }

        const existingEvent = await Event.findOne({ eventResponse });
        if (existingEvent) {
            return res.status(400).json({ message: "An event has already been created for this response." });
        }


        const venue = response.eventRequest.eventGround;
        const eventOrganizer = response.eventRequest.organizer;

    
        const event = new Event({
            name,
            eventResponse,
            venue,
            eventOrganizer,
            startDate,
            endDate,
            ticketsAvailable,
            ticketPrice,
            image
        });

        await event.save();
        res.status(201).json({ message: "Event created successfully", event });

    } catch (err) {
        console.error("Error creating event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.get("/events", async (req, res) => {
    try {
        const events = await Event.find()
            .populate("eventResponse")
            .populate("venue", "name location")
            .populate("eventOrganizer", "fname lname email");

        res.status(200).json(events);
    } catch (err) {
        console.error("Error fetching events:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.get("/events/:id", async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate("eventResponse")
            .populate("venue", "name location")
            .populate("eventOrganizer", "fname lname email");

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json(event);
    } catch (err) {
        console.error("Error fetching event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.patch("/events/:id", authMiddleware, async (req, res) => {
    try {
        const updates = req.body;
        const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
            .populate("eventResponse")
            .populate("venue", "name location")
            .populate("eventOrganizer", "fname lname email");

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ message: "Event updated successfully", event });
    } catch (err) {
        console.error("Error updating event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.delete("/events/:id", authMiddleware, async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ message: "Event deleted successfully" });
    } catch (err) {
        console.error("Error deleting event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
