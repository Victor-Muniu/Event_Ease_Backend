const express = require("express");
const axios = require("axios");
const moment = require("moment");
const Deposit = require("../models/deposit");
const EventResponse = require("../models/eventsResponse");
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
const MPESA_CALLBACK_URL = "https://yourdomain.com/mpesa-callback";

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

router.post("/initiate-paypal", authMiddleware, async (req, res) => {
  try {
    const { eventRequest, amountPaid } = req.body;

    const eventResponse = await EventResponse.findOne({ eventRequest });
    if (!eventResponse) {
      return res.status(404).json({ message: "Event response not found." });
    }

    const remainingBalance = eventResponse.totalPrice - amountPaid;
    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          { amount: { currency_code: "USD", value: amountPaid.toFixed(2) } },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.status(201).json({
      orderId: response.data.id,
      approveLink: response.data.links.find((link) => link.rel === "approve")
        ?.href,
      remainingBalance,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/paypal/:eventRequestId", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      null,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.data.status === "COMPLETED") {
      const deposit = new Deposit({
        eventRequest: req.params.eventRequestId,
        amountPaid: response.data.purchase_units[0].amount.value,
        paymentMethod: "PayPal",
        paymentStatus: "Paid",
        transactionId: orderId,
        remainingBalance: 0,
      });

      await deposit.save();
      return res.status(200).json({ message: "Payment successful", deposit });
    }

    res.status(400).json({ message: "Payment failed or not completed." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/initiate-mpesa", authMiddleware, async (req, res) => {
  try {
    const { eventRequest, amountPaid, phoneNumber } = req.body;
    const accessToken = await getMpesaAccessToken();
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amountPaid,
        PartyA: phoneNumber,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: "EventDeposit",
        TransactionDesc: "Event Deposit Payment",
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.status(201).json({
      merchantRequestId: response.data.MerchantRequestID,
      checkoutRequestId: response.data.CheckoutRequestID,
      message: "M-Pesa STK Push sent. Complete payment on your phone.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




router.post("/mpesa-callback", async (req, res) => {
    try {
        const callbackData = req.body;
        if (!callbackData.Body.stkCallback) {
            return res.status(400).json({ message: "Invalid M-Pesa callback data." });
        }

        const { MerchantRequestID, CheckoutRequestID, ResultCode, CallbackMetadata } =
            callbackData.Body.stkCallback;

        if (ResultCode === 0) {
        
            const amountPaid = CallbackMetadata.Item.find((item) => item.Name === "Amount").Value;
            const transactionId = CallbackMetadata.Item.find((item) => item.Name === "MpesaReceiptNumber").Value;
            const phoneNumber = CallbackMetadata.Item.find((item) => item.Name === "PhoneNumber").Value;

            
            const deposit = await Deposit.findOne({ merchantRequestId: MerchantRequestID, checkoutRequestId: CheckoutRequestID });

            if (deposit) {
                deposit.amountPaid += amountPaid;
                deposit.paymentStatus = "Paid";
                deposit.transactionId = transactionId;
                deposit.paymentDate = new Date();
                await deposit.save();
            }

            return res.status(200).json({ message: "Payment successful", deposit });
        }

        res.status(400).json({ message: "Payment failed or not completed." });
    } catch (error) {
        console.error("Error processing M-Pesa callback:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
