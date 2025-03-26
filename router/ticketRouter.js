const express = require("express");
const router = express.Router();
const Ticket = require("../modules/ticket");
const Event = require("../modules/event");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/tickets", authMiddleware, async (req, res) => {
    try {
        const { eventId, categories } = req.body;

        // ✅ Validate Event
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        if (event.status !== "Upcoming") {
            return res.status(400).json({ message: "Tickets can only be created for Upcoming events" });
        }

        // ✅ Check for Existing Tickets
        const existingTicket = await Ticket.findOne({ eventId });
        if (existingTicket) return res.status(400).json({ message: "Tickets already exist for this event" });

        // ✅ Validate Ticket Structure
        if (!categories.VVIP || !categories.VIP || !categories.Regular) {
            return res.status(400).json({ message: "All ticket categories (VVIP, VIP, Regular) must be provided" });
        }

        if (
            categories.VVIP.count < 0 || categories.VVIP.price < 0 ||
            categories.VIP.count < 0 || categories.VIP.price < 0 ||
            categories.Regular.count < 0 || categories.Regular.price < 0
        ) {
            return res.status(400).json({ message: "Ticket count and price must be non-negative" });
        }

        const totalTickets = categories.VVIP.count + categories.VIP.count + categories.Regular.count;

        // ✅ Save Ticket
        const ticket = new Ticket({ eventId, categories, totalTickets });
        await ticket.save();

        res.status(201).json({ message: "Ticket created successfully", ticket });
    } catch (err) {
        console.error("Error creating ticket:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/tickets", async (req, res) => {
    try {
        const tickets = await Ticket.find()
            .populate({
                path: "eventId",
                select: "name description date status bookingId",
                populate: {
                    path: "bookingId",
                    select: "response paymentDetails",
                    populate: [
                        {
                            path: "response",
                            select: "venueRequest",
                            populate: {
                                path: "venueRequest",
                                select: "eventName eventDescription eventDates venue organizer",
                                populate: [
                                    { path: "venue", select: "name location capacity" },
                                    { path: "organizer", select: "firstName lastName email phone organizationName" }
                                ]
                            }
                        },
                        { path: "paymentDetails", select: "method status amount transactionId timestamp" }
                    ]
                }
            });

        res.status(200).json(tickets);
    } catch (err) {
        console.error("Error fetching tickets:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


// 🟢 **Get a Single Ticket**
router.get("/tickets/:id", async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate({
                path: "eventId",
                select: "name date status",
                populate: {
                    path: "bookingId",
                    select: "response",
                    populate: {
                        path: "response",
                        select: "venueRequest",
                        populate: {
                            path: "venueRequest",
                            select: "venue",
                            populate: { path: "venue", select: "name location" }
                        }
                    }
                }
            });

        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

        res.status(200).json(ticket);
    } catch (err) {
        console.error("Error fetching ticket:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// 🟢 **Update a Ticket**
router.patch("/tickets/:id", authMiddleware, async (req, res) => {
    try {
        const { categories } = req.body;

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

        // ✅ Ensure `categories` include valid `count` and `price`
        if (!categories.VVIP || !categories.VIP || !categories.Regular) {
            return res.status(400).json({ message: "All ticket categories (VVIP, VIP, Regular) must be provided" });
        }

        if (
            categories.VVIP.count < 0 || categories.VVIP.price < 0 ||
            categories.VIP.count < 0 || categories.VIP.price < 0 ||
            categories.Regular.count < 0 || categories.Regular.price < 0
        ) {
            return res.status(400).json({ message: "Ticket count and price must be non-negative" });
        }

        ticket.categories = categories;
        ticket.totalTickets = categories.VVIP.count + categories.VIP.count + categories.Regular.count;
        await ticket.save();

        res.status(200).json({ message: "Ticket updated successfully", ticket });
    } catch (err) {
        console.error("Error updating ticket:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.delete("/tickets/:id", authMiddleware, async (req, res) => {
    try {
        const ticket = await Ticket.findByIdAndDelete(req.params.id);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

        res.status(200).json({ message: "Ticket deleted successfully" });
    } catch (err) {
        console.error("Error deleting ticket:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
