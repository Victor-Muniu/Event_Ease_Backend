const express = require('express');
const mongoose = require('mongoose');
const EventResponse = require('../models/eventsResponse');
const EventRequest = require('../models/eventGroundRequest');
const EventGround = require('../models/eventGround');
const authMiddleware = require('../middleware/staffMiddleware');

const router = express.Router();

router.post('/responses', authMiddleware, async (req, res) => {
    try {
        const { eventRequest, termsAndConditions } = req.body;
        const respondedBy = req.user.id;

        const eventRequestDoc = await EventRequest.findById(eventRequest).populate('eventGround');
        if (!eventRequestDoc || !eventRequestDoc.eventGround) {
            return res.status(404).json({ message: 'Event request or event ground not found' });
        }

        const eventGround = eventRequestDoc.eventGround;
        const days = eventRequestDoc.eventDates.length;

        const totalPrice = eventGround.pricePerDay * days;

        const eventResponse = new EventResponse({
            eventRequest,
            respondedBy,
            termsAndConditions,
            totalPrice
        });

        const formalMessage = await eventResponse.generateResponseMessage();

        eventResponse.responseMessage = formalMessage;
        await eventResponse.save();

        res.status(201).json(eventResponse);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/responses', async (req, res) => {
    try {
        const responses = await EventResponse.find().populate('eventRequest respondedBy');
        res.json(responses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/responses/:id', async (req, res) => {
    try {
        const response = await EventResponse.findById(req.params.id).populate('eventRequest respondedBy');
        if (!response) {
            return res.status(404).json({ message: 'Response not found' });
        }
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/responses/:id', async (req, res) => {
    try {
        const { termsAndConditions } = req.body;

        const updatedResponse = await EventResponse.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!updatedResponse) {
            return res.status(404).json({ message: 'Response not found' });
        }

        const eventRequestDoc = await EventRequest.findById(updatedResponse.eventRequest).populate('eventGround');
        if (!eventRequestDoc || !eventRequestDoc.eventGround) {
            return res.status(404).json({ message: 'Event request or event ground not found' });
        }

        const eventGround = eventRequestDoc.eventGround;
        const days = eventRequestDoc.eventDates.length;
        const totalPrice = eventGround.pricePerDay * days;

        updatedResponse.totalPrice = totalPrice;
        updatedResponse.termsAndConditions = termsAndConditions;

        const formalMessage = await updatedResponse.generateResponseMessage();
        updatedResponse.responseMessage = formalMessage;

        await updatedResponse.save();

        res.json(updatedResponse);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.delete('/responses/:id', async (req, res) => {
    try {
        const deletedResponse = await EventResponse.findByIdAndDelete(req.params.id);
        if (!deletedResponse) {
            return res.status(404).json({ message: 'Response not found' });
        }
        res.json({ message: 'Response deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
