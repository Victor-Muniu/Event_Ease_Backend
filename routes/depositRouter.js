const express = require("express");
const axios = require("axios");
const moment = require("moment");
const Deposit = require("../models/deposit");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const PAYPAL_CLIENT_ID =
  "AfXLbMpxE7XAqcsfShGVRpES5e0W2w5TmXWJP4H4mzSuUERqplkNQIhbfcCoRV8VyB9zRk-Yl7TNdf6u";
const PAYPAL_SECRET =
  "EKphO_6wHJdwzVLmbNsfnsYERoKiFgKoK-MVWMsDOxlgrIDYwrpzTB8SHEKYquae81bg5YMQ7ecBBpT7";
const PAYPAL_API = "https://api-m.paypal.com";

const MPESA_CONSUMER_KEY = "tgrnwduORfBWyty65WtXIGxT5Igsj2Gr2Nlnm0fABUPayyAe";
const MPESA_CONSUMER_SECRET =
  "A2Anm3MAs33cSNcZOMANqF9O7iJOkTJDyFbpUjJYiVR8yTngzY1MjGVsK1PLSne5";
const MPESA_SHORTCODE = "174379";
const MPESA_PASSKEY =
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const MPESA_CALLBACK_URL = "https://092c-41-212-84-26.ngrok-free.app/mpesa-callback";

async function getPayPalAccessToken() {
  const response = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_SECRET },
    }
  );
  return response.data.access_token;
}

async function getMpesaAccessToken() {
  const url =
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = Buffer.from(
    `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const response = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  return response.data.access_token;
}

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { eventRequest, amountPaid, paymentMethod, remainingBalance } = req.body;
    if (!eventRequest || !amountPaid || !paymentMethod || !remainingBalance) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const deposit = new Deposit({ eventRequest, amountPaid, paymentMethod, remainingBalance });
    await deposit.save();
    res.status(201).json(deposit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post("/pay/paypal", authMiddleware, async (req, res) => {
  try {
    const { depositId } = req.body;
    const deposit = await Deposit.findById(depositId);
    if (!deposit) return res.status(404).json({ message: "Deposit not found" });

    const accessToken = await getPayPalAccessToken();
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: depositId,
            amount: { currency_code: "USD", value: deposit.amountPaid },
          },
        ],
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.json({ approvalUrl: response.data.links.find((link) => link.rel === "approve").href });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// PayPal Webhook Callback
router.post("/paypal-webhook", async (req, res) => {
  try {
    console.log("✅ PayPal Webhook Triggered!");
    console.log("🔍 FULL PAYPAL CALLBACK BODY:", JSON.stringify(req.body, null, 2));

    const { id, status, purchase_units } = req.body;
    if (!purchase_units || !purchase_units[0].reference_id) {
      console.error("❌ Missing reference_id in webhook");
      return res.status(400).json({ message: "Invalid webhook data" });
    }

    const depositId = purchase_units[0].reference_id;

    if (status === "COMPLETED") {
      const deposit = await Deposit.findOneAndUpdate(
        { _id: depositId }, // ✅ Fix: Use the reference_id here
        { paymentStatus: "Paid", transactionId: id, paidAt: new Date() },
        { new: true }
      );

      if (deposit) {
        console.log("✅ Payment Updated Successfully:", deposit);
        return res.json({ message: "Payment successful", deposit });
      } else {
        console.error("❌ Deposit not found for ID:", depositId);
        return res.status(404).json({ message: "Deposit not found" });
      }
    }

    console.error("❌ Payment not completed");
    res.status(400).json({ message: "Payment not completed" });
  } catch (error) {
    console.error("❌ PayPal Webhook Error:", error);
    res.status(500).json({ message: error.message });
  }
});


// Initiate M-Pesa Payment
router.post("/pay/mpesa", authMiddleware, async (req, res) => {
  try {
    const { depositId, phoneNumber } = req.body;
    const deposit = await Deposit.findById(depositId);
    if (!deposit) return res.status(404).json({ message: "Deposit not found" });

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
        Amount: deposit.amountPaid,
        PartyA: phoneNumber,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: "Deposit Payment",
        TransactionDesc: "Payment for deposit",
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    deposit.transactionId = response.data.CheckoutRequestID;
    deposit.merchantRequestId = response.data.MerchantRequestID;
    await deposit.save();

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/mpesa-callback", async (req, res) => {
  try {
    console.log("✅ M-Pesa Callback Route Hit!");
    console.log("🔍 FULL M-PESA CALLBACK BODY:", JSON.stringify(req.body, null, 2));

    if (!req.body || !req.body.Body) {
      console.error("❌ Invalid Callback Format: Missing Body", req.body);
      return res.status(400).json({ message: "Invalid callback format" });
    }

    const { Body } = req.body;

    if (!Body.stkCallback) {
      console.error("❌ Invalid Callback: Missing stkCallback", req.body);
      return res.status(400).json({ message: "Invalid stkCallback format" });
    }

    if (Body.stkCallback.ResultCode !== 0) {
      console.error("❌ Payment Failed:", Body.stkCallback.ResultDesc);
      return res.status(400).json({ message: "Payment failed" });
    }

    const transactionId = Body.stkCallback.CheckoutRequestID;
    const mpesaReceipt = Body.stkCallback.CallbackMetadata?.Item?.find(
      (item) => item.Name === "MpesaReceiptNumber"
    )?.Value;

    console.log("🔎 Looking for transactionId:", transactionId);

    // Find and update deposit
    const deposit = await Deposit.findOneAndUpdate(
      { transactionId },
      { paymentStatus: "Paid", paidAt: new Date(), mpesaReceipt },
      { new: true }
    );

    if (deposit) {
      console.log("✅ Payment Updated Successfully:", deposit);
      return res.json({ message: "Payment successful", deposit });
    } else {
      console.error("❌ Transaction ID not found in DB:", transactionId);
      return res.status(400).json({ message: "Transaction ID not found" });
    }
  } catch (error) {
    console.error("❌ M-Pesa Callback Error:", error);
    res.status(500).json({ message: error.message });
  }
});


router.get("/deposits", authMiddleware, async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate({
        path: "eventRequest",
        populate: [
          { path: "organizer", select: "firstName lastName email" },
          { path: "eventGround", select: "name location" }
        ]
      });

    res.json(deposits);
  } catch (error) {
    console.error("Error fetching deposits:", error);
    res.status(500).json({ message: error.message });
  }
});


router.delete("/deposits/:id", authMiddleware, async (req, res) => {
  try {
    const deposit = await Deposit.findByIdAndDelete(req.params.id);
    if (!deposit) return res.status(404).json({ message: "Deposit not found" });
    res.json({ message: "Deposit deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
