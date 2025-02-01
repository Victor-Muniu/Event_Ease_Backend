const express = require("express");
const jwt = require("jsonwebtoken");
const EventOrganizer = require("../models/eventOrganizer");
const Staff = require("../models/staff")
const authMiddleware = require("../middleware/authMiddleware")
const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await EventOrganizer.findOne({ email });
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

router.post("/login_staff", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Staff.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User not Found" });
    }
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
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
          firstName: user.fname,
          lastName: user.lname,
          email: user.email,
          emp_no: user.emp_no,
        },
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.get('/current-user', authMiddleware, async (req, res) => {
  try {
      const user = await EventOrganizer.findOne({ emp_no: req.user.emp_no }); 
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.json({
          user: {
              fname: user.firstName,
              lname: user.lastName,
              email: user.email,
              id: user._id
          }
      });
  } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
