const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../modules/user");
const authMiddleware = require("../middleware/userMiddleware")
const router = express.Router();

router.post("/login-user", async (req, res) => {
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
        return res
          .status(403)
          .json({
            message: "Account not verified. Please verify your email first.",
          });
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
            gender: user.gender,
            phoneNumber: user.phoneNumber
          },
        });
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  });

  router.get('/current-attendee', authMiddleware, async (req, res) => {
    try {
      const user = await User.findOne({ email: req.user.email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.json({
        user: {
          fname: user.firstName,
          lname: user.lastName,
          email: user.email,
          gender: user.gender,
          phoneNumber: user.phoneNumber,
          id: user._id
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  module.exports = router;