const express = require("express");
const jwt = require("jsonwebtoken");
const Staff = require("../modules/staff");
const authMiddleware = require("../middleware/staffMiddleware");
const router = express.Router();

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


router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
});


router.post("/change_password", authMiddleware, async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    const user = await Staff.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.password !== oldPassword) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    user.password = newPassword;
    await user.save();
    res.clearCookie("token");
    res.status(200).json({ message: "Password changed successfully. Please log in again." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router