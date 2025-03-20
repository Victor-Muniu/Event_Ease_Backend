const express = require("express");
const VenueRequestResponse = require("../modules/venueResponse");
const VenueRequest = require("../modules/venueRequest");
const Venue = require("../modules/venue");
const authMiddleware = require("../middleware/staffMiddleware");
require("dotenv").config();
const nodemailer = require("nodemailer");

const router = express.Router();
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
const sendQuotationEmail = async (organizerEmail, venueName, dailyRates, totalAmount) => {
    const ratesList = dailyRates
        .map((rate) => `Date: ${rate.date}, Price: $${rate.price}`)
        .join("\n");

    const emailBody = `
        Dear Organizer,

        Below is the quotation for your venue request:

        Venue: ${venueName}

        Daily Rates:
        ${ratesList}

        Total Amount: KSH ${totalAmount}

        Please note:
        This quotation does not guarantee that the venue has been reserved.
        The venue will only be reserved once payment is made.
        In case of a no-show, 25% of the total amount will be charged as a penalty, and the rest will be refunded

        For payment please visit http://localhost:3001/create

        Best regards,
        Venue Management Team
    `;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: organizerEmail,
        subject: "Venue Quotation",
        text: emailBody,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Quotation email sent to:", organizerEmail);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};


router.post("/venue-request-responses", authMiddleware, async (req, res) => {
    try {
        const { venueRequest } = req.body;

        const existingRequest = await VenueRequest.findById(venueRequest).populate("venue organizer");
        if (!existingRequest) {
            return res.status(404).json({ message: "Venue request not found" });
        }

        const venue = existingRequest.venue;
        if (!venue || !venue.pricePerDay) {
            return res.status(400).json({ message: "Venue pricing information is missing" });
        }

        const dailyRates = existingRequest.eventDates.map((date) => ({
            date,
            price: venue.pricePerDay,
        }));

        const totalAmount = dailyRates.reduce((sum, rate) => sum + rate.price, 0);

        const response = new VenueRequestResponse({
            venueRequest,
            dailyRates,
            totalAmount,
        });

        await response.save();

        
        await sendQuotationEmail(existingRequest.organizer.email, venue.name, dailyRates, totalAmount);

        res.status(201).json({ message: "Response created successfully, quotation sent via email", response });
    } catch (err) {
        console.error("Error creating response:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/venue-request-responses", async (req, res) => {
    try {
        const responses = await VenueRequestResponse.find()
            .populate({
                path: "venueRequest",
                populate: [
                    { path: "venue", select: "name location pricePerDay" },
                    { path: "organizer", select: "firstName lastName email" }
                ]
            });

        res.status(200).json(responses);
    } catch (err) {
        console.error("Error fetching responses:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/venue-request-responses/:id", async (req, res) => {
    try {
        const response = await VenueRequestResponse.findById(req.params.id)
            .populate({
                path: "venueRequest",
                populate: [
                    { path: "venue", select: "name location pricePerDay" },
                    { path: "organizer", select: "firstName lastName email" }
                ]
            });

        if (!response) {
            return res.status(404).json({ message: "Response not found" });
        }

        res.status(200).json(response);
    } catch (err) {
        console.error("Error fetching response:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.patch("/venue-request-responses/:id", authMiddleware, async (req, res) => {
    try {
        const { venueRequest } = req.body;

        const existingResponse = await VenueRequestResponse.findById(req.params.id);
        if (!existingResponse) {
            return res.status(404).json({ message: "Response not found" });
        }

        const existingRequest = await VenueRequest.findById(venueRequest).populate("venue");
        if (!existingRequest) {
            return res.status(404).json({ message: "Venue request not found" });
        }

        const venue = existingRequest.venue;
        if (!venue || !venue.pricePerDay) {
            return res.status(400).json({ message: "Venue pricing information is missing" });
        }

        const dailyRates = existingRequest.eventDates.map(date => ({
            date,
            price: venue.pricePerDay
        }));

        const totalAmount = dailyRates.reduce((sum, rate) => sum + rate.price, 0);

        const updatedResponse = await VenueRequestResponse.findByIdAndUpdate(
            req.params.id,
            { dailyRates, totalAmount },
            { new: true, runValidators: true }
        );

        res.status(200).json({ message: "Response updated successfully", updatedResponse });
    } catch (err) {
        console.error("Error updating response:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.delete("/venue-request-responses/:id", authMiddleware, async (req, res) => {
    try {
        const response = await VenueRequestResponse.findByIdAndDelete(req.params.id);
        if (!response) {
            return res.status(404).json({ message: "Response not found" });
        }

        res.status(200).json({ message: "Response deleted successfully" });
    } catch (err) {
        console.error("Error deleting response:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
