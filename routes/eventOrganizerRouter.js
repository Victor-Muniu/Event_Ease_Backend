const express = require('express');
const EventOrganizer = require('../models/eventOrganizer');
const router = express.Router();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'victornjoroge2020@gmail.com', 
        pass: 'zfmh dfno vwsg maro' 
    }
});

router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, organizationName, address } = req.body;

        const existingOrganizer = await EventOrganizer.findOne({ email });
        if (existingOrganizer) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const organizer = new EventOrganizer({
            firstName,
            lastName,
            email,
            phone,
            password,
            organizationName,
            address
        });

        await organizer.save();

        const mailOptions = {
            from: 'victornjoroge2020@gmail.com',
            to: email,
            subject: 'Verify Your Email',
            text: `Your verification code is: ${organizer.verificationCode}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Email error:', error);
                return res.status(500).json({ message: 'Error sending email', error });
            }
            res.status(201).json({ message: 'Organizer registered. Verification email sent.' });
        });

    } catch (err) {
        console.error('Error registering:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/event-organizer', async (req, res) => {
    try {
        const organizers = await EventOrganizer.find(); 
        res.status(200).json(organizers);
    } catch (err) {
        console.error('Error fetching organizers:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/event-organizer/:id', async (req, res) => {
    try {
        const organizer = await EventOrganizer.findById(req.params.id);
        if (!organizer) {
            return res.status(404).json({ message: 'Event Organizer not found' });
        }
        res.status(200).json(organizer);
    } catch (err) {
        console.error('Error fetching organizer:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.patch('/event-organizer/:id',  async (req, res) => {
    try {
        const updates = req.body;
        const organizer = await EventOrganizer.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

        if (!organizer) {
            return res.status(404).json({ message: 'Event Organizer not found' });
        }

        res.status(200).json({ message: 'Event Organizer updated successfully', organizer });
    } catch (err) {
        console.error('Error updating organizer:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.delete('/event-organizer/:id', async (req, res) => {
    try {
        const organizer = await EventOrganizer.findByIdAndDelete(req.params.id);
        if (!organizer) {
            return res.status(404).json({ message: 'Event Organizer not found' });
        }
        res.status(200).json({ message: 'Event Organizer deleted successfully' });
    } catch (err) {
        console.error('Error deleting organizer:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.post('/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;

        const organizer = await EventOrganizer.findOne({ email });
        if (!organizer) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (organizer.isVerified) {
            return res.status(400).json({ message: 'User is already verified' });
        }

        if (organizer.verificationCode !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        
        organizer.isVerified = true;
        organizer.verificationCode = null;  
        await organizer.save();

        res.status(200).json({ message: 'Email verified successfully!' });

    } catch (err) {
        console.error('Error verifying email:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
