const express = require("express");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const unirest = require("unirest");
const Ticket = require("../models/ticket");
const Event = require("../models/event");
const authMiddleware = require("../middleware/userMiddleware");

const router = express.Router();

router.post("/tickets", authMiddleware, async (req, res) => {
  try {
    const { event_name, ticketType, quantity, phoneNumber } = req.body;
  

    const event = await Event.findOne({ name: event_name });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const totalAmount = event.ticketPrice * quantity;

    let stkRequest = unirest(
      "POST",
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    )
      .headers({
        "Content-Type": "application/json",
        Authorization: `Bearer zXHd0GrmGCBdViXToI2qpSaGDouR`,
      })
      .send(
        JSON.stringify({
          BusinessShortCode: 174379,
          Password: "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjUwMTMxMTAxOTQ3",
          Timestamp: "20250131101947",
          TransactionType: "CustomerPayBillOnline",
          Amount: totalAmount,
          PartyA: phoneNumber,
          PartyB: 174379,
          PhoneNumber: phoneNumber,
          CallBackURL: "https://yourdomain.com/mpesa-callback",
          AccountReference: event_name,
          TransactionDesc: "Ticket Purchase",
        })
      )
      .end(async (mpesaRes) => {
        if (mpesaRes.error) {
          return res
            .status(500)
            .json({
              message: "Payment initiation failed",
              error: mpesaRes.error,
            });
        }

        // Generate QR Code
        const ticketData = `${event_name}-${ticketType}-${phoneNumber}-${Date.now()}`;
        const qrCode = await QRCode.toDataURL(ticketData);

        // Create Ticket
        const ticket = new Ticket({
          event: event._id,
          ticketType,
          quantity,
          phoneNumber,
          totalAmount,
          status: "Pending Payment",
          qrCode,
        });

        await ticket.save();
        res.status(201).json({ message: "Ticket purchase initiated", ticket });
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// M-Pesa Callback (Handle Payment Confirmation)
router.post("/mpesa-callback", async (req, res) => {
  try {
    const { Body } = req.body;
    if (Body.stkCallback.ResultCode === 0) {
      const phoneNumber = Body.stkCallback.CallbackMetadata.Item.find(
        (i) => i.Name === "PhoneNumber"
      ).Value;
      const ticket = await Ticket.findOne({
        phoneNumber,
        status: "Pending Payment",
      });

      if (ticket) {
        ticket.status = "Paid";
        await ticket.save();
      }
    }
    res.status(200).json({ message: "Callback received" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get Tickets
router.get("/tickets", authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find();
    res.status(200).json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete Ticket
router.delete("/tickets/:id", authMiddleware, async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Ticket deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;







