const express = require("express");
const VenueRequest = require("../modules/venueRequest");
const Venue = require("../modules/venue");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


router.post("/venue-requests", authMiddleware, async (req, res) => {
    try {
        const { venueName, eventName, eventDescription, eventDates, expectedAttendance, additionalRequests } = req.body;

        const venue = await Venue.findOne({ name: venueName });
        if (!venue) {
            return res.status(404).json({ message: "Venue not found" });
        }

        const organizerId = req.user._id;


        const newVenueRequest = new VenueRequest({
            venue: venue._id,
            organizer: organizerId,
            eventName,
            eventDescription,
            eventDates,
            expectedAttendance,
            additionalRequests,
            isRead: false 
        });

        await newVenueRequest.save();

        res.status(201).json({ message: "Venue request submitted successfully", venueRequest: newVenueRequest });
    } catch (err) {
        console.error("Error creating venue request:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.patch("/venue-requests/:id/read", async (req, res) => {
    try {
        const updatedRequest = await VenueRequest.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );

        if (!updatedRequest) {
            return res.status(404).json({ message: "Venue request not found" });
        }

        res.status(200).json({ message: "Venue request marked as read", venueRequest: updatedRequest });

    } catch (err) {
        console.error("Error updating venue request:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});



router.get("/venue-requests", async (req, res) => {
    try {
        const requests = await VenueRequest.find()
            .populate("organizer", "firstName lastName email phone organizationName")
            .populate("venue", "name location capacity pricePerHour");

        res.status(200).json(requests);

    } catch (err) {
        console.error("Error fetching venue requests:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/venue-requests/:id",  async (req, res) => {
    try {
        const request = await VenueRequest.findById(req.params.id)
            .populate("organizer", "firstName lastName email phone organizationName")
            .populate("venue", "name location capacity pricePerHour");

        if (!request) {
            return res.status(404).json({ message: "Venue request not found" });
        }

        res.status(200).json(request);

    } catch (err) {
        console.error("Error fetching venue request:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});



router.delete("/venue-requests/:id", authMiddleware, async (req, res) => {
    try {
        const deletedRequest = await VenueRequest.findByIdAndDelete(req.params.id);

        if (!deletedRequest) {
            return res.status(404).json({ message: "Venue request not found" });
        }

        res.status(200).json({ message: "Venue request deleted successfully" });

    } catch (err) {
        console.error("Error deleting venue request:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
