const express = require("express");
const Staff = require("../models/staff");
const router = express.Router();


router.post("/staff",  async (req, res) => {
    try {
        const { emp_no, fname, lname, email, phone, department, role, password, dateOfJoining } = req.body;

        const existingStaff = await Staff.findOne({ $or: [{ emp_no }, { email }] });
        if (existingStaff) {
            return res.status(400).json({ message: "Employee number or email already exists" });
        }

        const staff = new Staff({
            emp_no,
            fname,
            lname,
            email,
            phone,
            department,
            role,
            password, 
            dateOfJoining,
        });

        await staff.save();
        res.status(201).json({ message: "Staff member created successfully", staff });
    } catch (err) {
        console.error("Error creating staff:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.get("/staff",  async (req, res) => {
    try {
        const staffMembers = await Staff.find();
        res.status(200).json(staffMembers);
    } catch (err) {
        console.error("Error fetching staff members:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.get("/staff/:id", async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        res.status(200).json(staff);
    } catch (err) {
        console.error("Error fetching staff member:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.patch("/staff/:id", async (req, res) => {
    try {
        const updates = req.body;
        const staff = await Staff.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        res.status(200).json({ message: "Staff member updated successfully", staff });
    } catch (err) {
        console.error("Error updating staff member:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.delete("/staff/:id", async (req, res) => {
    try {
        const staff = await Staff.findByIdAndDelete(req.params.id);

        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        res.status(200).json({ message: "Staff member deleted successfully" });
    } catch (err) {
        console.error("Error deleting staff member:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
