const express = require("express");
const router = express.Router();
const Event = require("../modules/event");
const Booking = require("../modules/bookings");
const authMiddleware = require("../middleware/authMiddleware");


router.post("/events", authMiddleware, async (req, res) => {
    try {
        const { bookingId, status } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (booking.status !== "Confirmed") {
            return res.status(400).json({ message: "Cannot create event. Booking is not confirmed." });
        }

        const existingEvent = await Event.findOne({ bookingId });
        if (existingEvent) return res.status(400).json({ message: "Event already exists for this booking" });

        const event = new Event({ bookingId, status });
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
            .populate({
                path: "bookingId",
                populate: [
                    {
                        path: "response",
                        populate: { 
                            path: "venueRequest",
                            populate: { path: "venue" }
                        }
                    },
                    { path: "organizer" } // Correct way to get the organizer
                ]
            });

        res.status(200).json(events);
    } catch (err) {
        console.error("Error fetching events:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/events/:id", async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate({
                path: "bookingId",
                populate: [
                    {
                        path: "response",
                        populate: { 
                            path: "venueRequest",
                            populate: { path: "venue" }
                        }
                    },
                    { path: "organizer" } // Correct way to get the organizer
                ]
            });

        if (!event) return res.status(404).json({ message: "Event not found" });

        res.status(200).json(event);
    } catch (err) {
        console.error("Error fetching event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.patch("/events/:id", authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;

        const event = await Event.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!event) return res.status(404).json({ message: "Event not found" });

        res.status(200).json({ message: "Event status updated successfully", event });
    } catch (err) {
        console.error("Error updating event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.delete("/events/:id", authMiddleware, async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        res.status(200).json({ message: "Event deleted successfully" });
    } catch (err) {
        console.error("Error deleting event:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
