const express = require("express");
const router = express.Router();
const Booking = require("../modules/bookings");
const Response = require("../modules/venueResponse");
const { processMpesaPayment, createPayPalOrder,handleMpesaCallback,capturePayPalPayment, handlePayPalWebhook } = require("../utils/paymentGateways");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/bookings", authMiddleware, async (req, res) => {
    try {
        const { responseId, paymentMethod } = req.body;
        const response = await Response.findById(responseId).populate("venueRequest");
        if (!response) return res.status(404).json({ message: "Response not found" });

        const venueRequest = response.venueRequest;
        if (!venueRequest) return res.status(400).json({ message: "VenueRequest not found in response" });

        const venueId = venueRequest.venue;
        const organizerId = venueRequest.organizer;
        if (!venueId || !organizerId) return res.status(400).json({ message: "Venue or Organizer ID missing" });

        const totalAmount = response.totalAmount;
        if (!totalAmount) return res.status(400).json({ message: "Total amount is missing" });

        const booking = new Booking({
            response: responseId,
            venue: venueId,
            organizer: organizerId,
            totalAmount,
            amountPaid: 0,
            paymentMethod,
            status: "Tentative"
        });

        await booking.save();
        res.status(201).json({ message: "Booking created successfully", booking });
    } catch (err) {
        console.error("Error creating booking:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Initiate Payment
router.post("/bookings/:id/pay", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, phoneNumber, email } = req.body;
        const booking = await Booking.findById(id);

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (paymentMethod === "M-Pesa") {
            if (!phoneNumber) return res.status(400).json({ message: "Phone number is required for M-Pesa" });
            const paymentResponse = await processMpesaPayment(id, phoneNumber);
            return res.status(200).json({ message: "M-Pesa STK Push sent", paymentResponse });
        } 
        else if (paymentMethod === "PayPal") {
            if (!email) return res.status(400).json({ message: "Email is required for PayPal payment" });

            const paymentResponse = await createPayPalOrder(id, email);
            return res.status(200).json({ message: "PayPal payment initiated. Check your email for authorization link.", paymentResponse });
        } 
        else {
            return res.status(400).json({ message: "Invalid payment method" });
        }
    } catch (err) {
        console.error("Error processing payment:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});



router.post("/bookings/:id/paypal-capture", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params; // Booking ID
        const { orderId } = req.body; // PayPal Order ID
        
        if (!orderId) return res.status(400).json({ message: "PayPal Order ID is required" });

        // Capture the PayPal payment
        const paymentResponse = await capturePayPalPayment(orderId, id);

        if (!paymentResponse || paymentResponse.status !== "COMPLETED") {
            return res.status(400).json({ message: "PayPal payment capture failed", paymentResponse });
        }

        // Find the booking
        let booking = await Booking.findById(id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Update payment details
        const amountPaid = parseFloat(paymentResponse.amount);
        booking.amountPaid += amountPaid;

        booking.paymentDetails.push({
            amount: amountPaid,
            paymentMethod: "PayPal",
            transactionId: paymentResponse.transactionId,
            timestamp: new Date(),
            status: "Success",
            description: "Payment captured via PayPal",
        });

        // Update booking status
        booking.status = booking.amountPaid >= booking.totalAmount ? "Confirmed" : "Tentative";

        // Save the updated booking
        await booking.save();

        res.status(200).json({ message: "PayPal payment captured successfully", booking });
    } catch (err) {
        console.error("Error capturing PayPal payment:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});



router.post("/payments/callback", handleMpesaCallback);

router.post("/payments/paypal-webhook", async (req, res) => {
    try {
        const event = req.body;
        console.log("🔔 Received PayPal Webhook:", event);

        if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
            const orderId = event.resource.id;
            const bookingId = event.resource.purchase_units[0].reference_id;

            console.log(`✅ Payment Approved for Order ID: ${orderId}, Booking ID: ${bookingId}`);

            // Capture the PayPal Payment automatically
            const paymentResponse = await capturePayPalPayment(orderId, bookingId);

            if (paymentResponse.status === "COMPLETED") {
                // Update the booking with the captured payment details
                let booking = await Booking.findById(bookingId);
                if (!booking) return res.status(404).json({ message: "Booking not found" });

                const amountPaid = parseFloat(paymentResponse.amount);
                booking.amountPaid += amountPaid;

                booking.paymentDetails.push({
                    amount: amountPaid,
                    paymentMethod: "PayPal",
                    transactionId: paymentResponse.transactionId,
                    timestamp: new Date(),
                    status: "Success",
                    description: "Payment captured via PayPal",
                });

                // Confirm the booking if the full amount is paid
                booking.status = booking.amountPaid >= booking.totalAmount ? "Confirmed" : "Tentative";

                await booking.save();
                console.log("✅ Payment captured and booking updated:", booking);
            } else {
                console.log("⚠️ Payment capture failed:", paymentResponse);
            }

            return res.status(200).json({ message: "Webhook processed successfully" });
        }

        res.status(400).json({ message: "Unhandled event type" });
    } catch (err) {
        console.error("❌ Error handling PayPal webhook:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});



router.get("/bookings", async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate({
                path: "response",
                populate: { 
                    path: "venueRequest", 
                    populate: { path: "venue" } 
                }
            })
            .populate("organizer"); 

        res.status(200).json(bookings);
    } catch (err) {
        console.error("Error fetching bookings:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


// Fetch Single Booking
router.get("/bookings/:id",  async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate("response");
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        res.status(200).json(booking);
    } catch (err) {
        console.error("Error fetching booking:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Delete Booking
router.delete("/bookings/:id", authMiddleware, async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        res.status(200).json({ message: "Booking deleted successfully" });
    } catch (err) {
        console.error("Error deleting booking:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;