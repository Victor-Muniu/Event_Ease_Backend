require('dotenv').config(); 
const express = require('express');
const EventOrganizer = require('../modules/eventOrganizer');
const router = express.Router();
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
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
            from: process.env.EMAIL_USER,
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


router.get('/organizers', async (req, res) => {
    try {
        const organizers = await EventOrganizer.find();
        res.status(200).json(organizers);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.get('/organizer/:id', async (req, res) => {
    try {
        const organizer = await EventOrganizer.findById(req.params.id);
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }
        res.status(200).json(organizer);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.patch('/organizer/:id', async (req, res) => {
    try {
        const organizer = await EventOrganizer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }
        res.status(200).json({ message: 'Organizer updated successfully', organizer });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.delete('/organizer/:id', async (req, res) => {
    try {
        const organizer = await EventOrganizer.findByIdAndDelete(req.params.id);
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }
        res.status(200).json({ message: 'Organizer deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
