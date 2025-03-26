const axios = require("axios");
const Payment = require("../modules/ticketPurchase");
const moment = require("moment");
require("dotenv").config();


async function generateMpesaToken() {
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const response = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
  return response.data.access_token;
}


async function processMpesaPayment(amount, phoneNumber) {
  try {
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSWORD}${timestamp}`).toString("base64");

    const accessToken = await generateMpesaToken();
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: `${process.env.BASE_URL}/tickets/callback`,
        AccountReference: "Ticket Purchase",
        TransactionDesc: "Ticket Payment",
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return response.data;
  } catch (error) {
    console.error("M-Pesa Payment Error:", error);
    throw new Error("M-Pesa Payment Failed");
  }
}

async function handleMpesaTicketCallback(req, res) {
  try {
      const { Body: { stkCallback } } = req.body;
      console.log("M-Pesa Ticket Callback Data:", stkCallback);

      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

      let payment = await Payment.findOne({ "paymentDetails.transactionId": CheckoutRequestID });
      if (!payment) return res.status(404).json({ message: "Payment not found" });

      if (ResultCode === 0) {
          const amount = CallbackMetadata.Item.find(item => item.Name === "Amount")?.Value || 0;
          const mpesaReceipt = CallbackMetadata.Item.find(item => item.Name === "MpesaReceiptNumber")?.Value || "";

          payment.paymentDetails.push({
              paymentMethod: "M-Pesa",
              transactionId: mpesaReceipt,
              amount,
              timestamp: new Date()
          });

          payment.amountPaid += amount;
          payment.status = payment.amountPaid >= payment.totalAmount ? "Confirmed" : "Pending";

          await payment.save();

          return res.status(200).json({ message: "Payment successful, tickets confirmed", payment });
      } else {
          return res.status(400).json({ message: "Payment failed", reason: ResultDesc });
      }
  } catch (error) {
      console.error("M-Pesa Callback Error:", error);
      return res.status(500).json({ message: "Server error" });
  }
}

  





module.exports = {
  processMpesaPayment,
  handleMpesaTicketCallback
};
