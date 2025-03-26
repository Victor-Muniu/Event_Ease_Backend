const express = require("express");
const router = express.Router();
const Ticket = require("../modules/ticket");
const Payment = require("../modules/ticketPurchase");
const User = require("../modules/user");
const {
    processMpesaPayment,
    handleMpesaTicketCallback
} = require("../utils/new");
const authMiddleware = require("../middleware/userMiddleware");

router.post("/purchase", authMiddleware, async (req, res) => {
    try {
        const { ticketId, category, quantity, paymentMethod, phoneNumber, email } = req.body;
        const attendeeId = req.user._id;

        const attendee = await User.findById(attendeeId);
        if (!attendee) return res.status(404).json({ message: "Attendee not found" });

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

        if (!ticket.categories[category]) {
            return res.status(400).json({ message: "Invalid ticket category" });
        }

        if (ticket.categories[category].count < quantity) {
            return res.status(400).json({ message: "Not enough tickets available" });
        }

        const pricePerTicket = ticket.categories[category].price;
        const totalAmount = pricePerTicket * quantity;

        let transactionId = null;
        let status = "Pending";

        if (paymentMethod === "M-Pesa") {
          const mpesaResponse = await processMpesaPayment(totalAmount, phoneNumber);
          transactionId = mpesaResponse.CheckoutRequestID; 
      
          const payment = new Payment({
              response: ticketId,
              attendeeId: attendeeId,
              totalAmount,
              amountPaid: 0,
              status,
              paymentDetails: [{ 
                  paymentMethod: "M-Pesa", 
                  transactionId, // Save CheckoutRequestID here
                  amount: 0, 
                  timestamp: new Date() 
              }],
          });
      
          await payment.save();
          return res.status(201).json({ message: "Ticket purchase initiated", payment });
      }else if (paymentMethod === "PayPal") {
            const paypalResponse = await createPayPalOrder(totalAmount, email);
            transactionId = paypalResponse.id;
        } else {
            return res.status(400).json({ message: "Invalid payment method" });
        }

        const payment = new Payment({
            response: ticketId,
            attendeeId: attendeeId,
            totalAmount,
            amountPaid: 0,
            status,
            paymentDetails: [], 
        });

        await payment.save();
        res.status(201).json({ message: "Ticket purchase initiated", payment });
    } catch (err) {
        console.error("Error purchasing ticket:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.post("/tickets/callback", handleMpesaTicketCallback);

router.get("/ticket_purchase", async (req, res) => {
  try {
    const payments = await Payment.find()
        .populate({
            path: "response", 
            populate: { 
                path: "eventId", 
                populate: { 
                    path: "bookingId", 
                    populate: [
                        { path: "organizer" }, 
                        { 
                            path: "response", 
                            populate: { path: "venueRequest" } 
                        }
                    ]
                }
            } 
        })
        .populate("attendeeId"); 

    res.status(200).json({ message: "Payments retrieved successfully", payments });
} catch (error) {
    console.error("Error retrieving payments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
}
});


module.exports = router;
