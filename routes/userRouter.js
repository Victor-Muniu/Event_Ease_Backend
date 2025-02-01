const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'victornjoroge2020@gmail.com',
        pass: 'zfmh dfno vwsg maro'
    }
});

const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();


router.post('/register_user', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "User already exists" });

        const verificationCode = generateVerificationCode();

        user = new User({ firstName, lastName, email, password, phone, verificationCode });

        await user.save();

        await transporter.sendMail({
            from: 'victornjorge2020@gmail.com',
            to: email,
            subject: 'Email Verification Code',
            text: `Your verification code is ${verificationCode}`
        });

        res.status(201).json({ message: "User registered! Check email for verification code" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.post('/verify_user', async (req, res) => {
    try {
        const { email, verificationCode } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.verificationCode !== verificationCode) {
            return res.status(400).json({ message: "Invalid verification code" });
        }

        user.isVerified = true;
        user.verificationCode = null;
        await user.save();

        res.status(200).json({ message: "Email verified successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


router.post('/login_user', async (req, res) => {
    try {
        const { email, password } = req.body;
    
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(401).json({ message: "User not Found" });
        }
        if (user.password !== password) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Account not verified. Please verify your email first.' });
        }
    
        const payload = {
          user: {
            email: user.email,
          },
        };
        jwt.sign(payload, "your_secret_key", { expiresIn: "1h" }, (err, token) => {
          if (err) {
            throw err;
          }
          res.cookie("token", token, {
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600000,
          });
    
          res.status(200).json({
            user: {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              organizationName: user.organizationName,
            },
          });
        });
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
      }
});

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.patch('/profile', authMiddleware, async (req, res) => {
    try {
        const updates = req.body;
        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ message: "Profile updated successfully", user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.delete('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
