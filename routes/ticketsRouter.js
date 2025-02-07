const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const QRCode = require("qrcode");
const moment = require("moment");
const Ticket = require("../models/ticket");
const authMiddleware = require("../middleware/authMiddleware");


const router = express.Router();

const PAYPAL_CLIENT_ID = 'AfXLbMpxE7XAqcsfShGVRpES5e0W2w5TmXWJP4H4mzSuUERqplkNQIhbfcCoRV8VyB9zRk-Yl7TNdf6u';
const PAYPAL_SECRET = 'EKphO_6wHJdwzVLmbNsfnsYERoKiFgKoK-MVWMsDOxlgrIDYwrpzTB8SHEKYquae81bg5YMQ7ecBBpT7';
const PAYPAL_API = "https://api-m.paypal.com";


const MPESA_CONSUMER_KEY = 'tgrnwduORfBWyty65WtXIGxT5Igsj2Gr2Nlnm0fABUPayyAe';
const MPESA_CONSUMER_SECRET = 'A2Anm3MAs33cSNcZOMANqF9O7iJOkTJDyFbpUjJYiVR8yTngzY1MjGVsK1PLSne5';
const MPESA_SHORTCODE = "174379";
const MPESA_PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const MPESA_CALLBACK_URL = "https://yourdomain.com/mpesa-callback";

async function getPayPalAccessToken() {
    try {
        const response = await axios.post(
            `${PAYPAL_API}/v1/oauth2/token`,
            "grant_type=client_credentials",
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_SECRET },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching PayPal token:", error.response?.data || error.message);
        throw new Error("Failed to authenticate with PayPal.");
    }
}

async function getMpesaAccessToken() {
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
    
    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching M-Pesa token:", error.message);
        throw new Error("Failed to authenticate with M-Pesa.");
    }
}

router.post("/tickets", authMiddleware, async (req, res) => {
    try {
        const { event, ticketType, quantity, totalAmount, paymentMethod, phoneNumber } = req.body;

        if (quantity <= 0 || totalAmount <= 0) {
            return res.status(400).json({ message: "Invalid quantity or amount." });
        }

        let paymentDetails = {};

        if (paymentMethod === "PayPal") {
            const accessToken = await getPayPalAccessToken();
            const response = await axios.post(
                `${PAYPAL_API}/v2/checkout/orders`,
                {
                    intent: "CAPTURE",
                    purchase_units: [{ amount: { currency_code: "USD", value: totalAmount.toFixed(2) } }],
                },
                {
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                }
            );
            paymentDetails = { orderId: response.data.id, approveLink: response.data.links.find(link => link.rel === "approve")?.href };
        } else if (paymentMethod === "M-Pesa") {
            const accessToken = await getMpesaAccessToken();
            const timestamp = moment().format("YYYYMMDDHHmmss");
            const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");
            
            const response = await axios.post(
                "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
                {
                    BusinessShortCode: MPESA_SHORTCODE,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: "CustomerPayBillOnline",
                    Amount: totalAmount,
                    PartyA: phoneNumber,
                    PartyB: MPESA_SHORTCODE,
                    PhoneNumber: phoneNumber,
                    CallBackURL: MPESA_CALLBACK_URL,
                    AccountReference: "TicketPurchase",
                    TransactionDesc: "Ticket Payment"
                },
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );
            paymentDetails = { merchantRequestId: response.data.MerchantRequestID, checkoutRequestId: response.data.CheckoutRequestID };
        } else {
            return res.status(400).json({ message: "Unsupported payment method." });
        }

        const ticket = new Ticket({
            user: req.user._id,
            event,
            ticketType,
            quantity,
            totalAmount,
            paymentMethod,
            paymentStatus: "Pending",
        });
        await ticket.save();
        res.status(201).json({ message: "Ticket created. Complete payment.", ...paymentDetails });
    } catch (err) {
        console.error("Error purchasing ticket:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.post("/mpesa-callback", async (req, res) => {
    const callbackData = req.body;
    if (!callbackData.Body.stkCallback) {
        return res.status(400).json({ message: "Invalid M-Pesa callback data." });
    }
    
    const { MerchantRequestID, CheckoutRequestID, ResultCode } = callbackData.Body.stkCallback;
    if (ResultCode === 0) {
        const ticket = await Ticket.findOne({ merchantRequestId: MerchantRequestID, checkoutRequestId: CheckoutRequestID });
        if (ticket) {
            ticket.paymentStatus = "Paid";
            ticket.qrCode = await QRCode.toDataURL(`Ticket for event: ${ticket.event}`);
            await ticket.save();
            return res.status(200).json({ message: "Payment successful", ticket });
        }
    }
    res.status(400).json({ message: "Payment failed or not completed." });
});
router.post("/tickets/paypal/:ticketId", authMiddleware, async (req, res) => {
  try {
      const { orderId } = req.body;
      const ticket = await Ticket.findById(req.params.ticketId);

      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      const accessToken = await getPayPalAccessToken();

      const response = await axios.post(
          `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
          null, // ✅ FIXED: Removed `{}` from the request body
          {
              headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
              },
          }
      );

      if (response.data.status === "COMPLETED") {
          ticket.paymentStatus = "Paid";
          ticket.qrCode = await QRCode.toDataURL(`Ticket for event: ${ticket.event}`);
          await ticket.save();

          return res.status(200).json({ message: "Payment successful", ticket });
      } else {
          return res.status(400).json({ message: "Payment failed or not completed." });
      }
  } catch (err) {
      console.error("Error capturing payment:", err.response?.data || err.message);
      res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/tickets", authMiddleware, async (req, res) => {
  try {
      const tickets = await Ticket.find()
          .populate("user", "fname lname")
          .populate("event", "name");
      res.status(200).json(tickets);
  } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.get("/tickets/:id", authMiddleware, async (req, res) => {
  try {
      const ticket = await Ticket.findById(req.params.id)
          .populate("user", "fname lname")
          .populate("event", "name");
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      res.status(200).json(ticket);
  } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/tickets/:id", authMiddleware, async (req, res) => {
  try {
      const ticket = await Ticket.findByIdAndDelete(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      res.status(200).json({ message: "Ticket deleted" });
  } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
  }
});


module.exports = router;
