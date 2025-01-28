const express = require('express');
const EventGround = require('../models/eventGround'); 
const router = express.Router();

router.post('/event-grounds', async (req, res) => {
    try {
        const {
            name,
            location,
            capacity,
            availability,
            pricePerDay,
            amenities,
            description,
            images,
        } = req.body;

        const eventGround = new EventGround({
            name,
            location,
            capacity,
            availability,
            pricePerDay,
            amenities,
            description,
            images,
        });

        await eventGround.save();
        res.status(201).json({ message: 'Event ground created successfully', eventGround });
    } catch (err) {
        console.error('Error creating event ground:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/event-grounds', async (req, res) => {
    try {
        const eventGrounds = await EventGround.find();
        res.status(200).json(eventGrounds);
    } catch (err) {
        console.error('Error fetching event grounds:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.get('/event-grounds/:id', async (req, res) => {
    try {
        const eventGround = await EventGround.findById(req.params.id);

        if (!eventGround) {
            return res.status(404).json({ message: 'Event ground not found' });
        }

        res.status(200).json(eventGround);
    } catch (err) {
        console.error('Error fetching event ground:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.patch('/event-grounds/:id', async (req, res) => {
    try {
        const updates = req.body;
        const eventGround = await EventGround.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!eventGround) {
            return res.status(404).json({ message: 'Event ground not found' });
        }

        res.status(200).json({ message: 'Event ground updated successfully', eventGround });
    } catch (err) {
        console.error('Error updating event ground:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.delete('/event-grounds/:id', async (req, res) => {
    try {
        const eventGround = await EventGround.findByIdAndDelete(req.params.id);

        if (!eventGround) {
            return res.status(404).json({ message: 'Event ground not found' });
        }

        res.status(200).json({ message: 'Event ground deleted successfully' });
    } catch (err) {
        console.error('Error deleting event ground:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
