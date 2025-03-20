require('dotenv').config();
const express = require('express');
const User = require('../modules/user');
const router = express.Router();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

router.post('/register-user', async (req, res) => {
    try {
        const { firstName, lastName, gender, email, phoneNumber, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const verificationCode = generateVerificationCode();

        const user = new User({
            firstName,
            lastName,
            gender,
            email,
            phoneNumber,
            password,
            verificationCode
        });

        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email',
            text: `Your verification code is: ${verificationCode}`
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.error('Email error:', error);
                return res.status(500).json({ message: 'Error sending email', error });
            }
            res.status(201).json({ message: 'User registered. Verification email sent.' });
        });

    } catch (err) {
        console.error('Error registering:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Verify Email
router.post('/verify-user', async (req, res) => {
    try {
        const { email, code } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User is already verified' });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        user.isVerified = true;
        user.verificationCode = null;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully!' });

    } catch (err) {
        console.error('Error verifying email:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get all users
router.get('/user', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get user by ID
router.get('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update user (PATCH)
router.patch('/user/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User updated successfully', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete user
router.delete('/user/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
