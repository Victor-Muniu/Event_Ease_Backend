const express = require('express');
const EventResponse = require('../models/eventsResponse');
const EventRequest = require('../models/eventGroundRequest');

const authMiddleware = require('../middleware/staffMiddleware');

const router = express.Router();



router.post('/event-responses', authMiddleware, async (req, res) => {
    try {
        const { eventRequestId, responseMessage } = req.body;

        const eventRequest = await EventRequest.findById(eventRequestId).populate('eventGround');
        if (!eventRequest) {
            return res.status(404).json({ message: "Event request not found" });
        }

        const response = new EventResponse({
            eventRequest: eventRequestId,
            responseMessage,
            respondedBy: req.user._id
        });

        const totalPrice = response.calculateTotalPrice(eventRequest);
        response.totalPrice = totalPrice;

        await response.save();
       
        res.status(201).json({
            message: "Response created successfully",
            response
        });

    } catch (err) {
        console.error("Error creating response:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.get('/event-responses', async (req, res) => {
    try {
        const responses = await EventResponse.find()
            .populate('eventRequest')
            .populate('respondedBy', 'fname lname role')
            .exec();
        res.status(200).json({ responses });
    } catch (err) {
        console.error("Error fetching responses:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get('/event-responses/:id', async (req, res) => {
    try {
        const response = await EventResponse.findById(req.params.id)
            .populate('eventRequest')
            .populate('respondedBy', 'fname lname role');
        
        if (!response) {
            return res.status(404).json({ message: "Response not found" });
        }
        res.status(200).json({ response });
    } catch (err) {
        console.error("Error fetching response:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.patch('/event-responses/:id', authMiddleware, async (req, res) => {
    try {
        const updates = req.body;
        const response = await EventResponse.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
            .populate('eventRequest')
            .populate('respondedBy', 'fname lname role');
        
        if (!response) {
            return res.status(404).json({ message: "Response not found" });
        }
        res.status(200).json({
            message: "Response updated successfully",
            response
        });
    } catch (err) {
        console.error("Error updating response:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.delete('/event-responses/:id', authMiddleware, async (req, res) => {
    try {
        const response = await EventResponse.findByIdAndDelete(req.params.id);
        if (!response) {
            return res.status(404).json({ message: "Response not found" });
        }
        res.status(200).json({ message: "Response deleted successfully" });
    } catch (err) {
        console.error("Error deleting response:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
