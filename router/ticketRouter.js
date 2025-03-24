const express = require("express");
const router = express.Router();
const Ticket = require("../modules/ticket");
const Event = require("../modules/event");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/tickets", authMiddleware, async (req, res) => {
    try {
        const { eventId, categories } = req.body;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

       
        if (event.status !== "Upcoming") {
            return res.status(400).json({ message: "Tickets can only be created for Upcoming events" });
        }


        const existingTicket = await Ticket.findOne({ eventId });
        if (existingTicket) return res.status(400).json({ message: "Tickets already exist for this event" });

        const totalTickets = categories.VVIP.count + categories.VIP.count + categories.Regular.count;

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
                populate: {
                    path: "bookingId",
                    populate: [
                        {
                            path: "response",
                            populate: [
                                {
                                    path: "venueRequest",
                                    populate: [
                                        { path: "venue" },
                                        { path: "organizer" }
                                    ]
                                }
                            ]
                        },
                        { path: "paymentDetails" }
                    ]
                }
            });

        res.status(200).json(tickets);
    } catch (err) {
        console.error("Error fetching tickets:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.get("/tickets/:id", async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate({
                path: "eventId",
                populate: {
                    path: "bookingId",
                    populate: { 
                        path: "response",
                        populate: { 
                            path: "venueRequest",
                            populate: { path: "venue" }
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

router.patch("/tickets/:id", authMiddleware, async (req, res) => {
    try {
        const { categories } = req.body;

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

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
