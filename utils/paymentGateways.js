const axios = require("axios");
const Booking = require("../modules/bookings");
const moment = require("moment");
const nodemailer = require("nodemailer");
require("dotenv").config();

async function generateMpesaToken() {
  const url =
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");
  const response = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return response.data.access_token;
}
const timestamp = moment().format("YYYYMMDDHHmmss");


const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSWORD}${timestamp}`).toString("base64");
async function processMpesaPayment(bookingId, phoneNumber) {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error("Booking not found");

    const accessToken = await generateMpesaToken();
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password, 
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: booking.totalAmount,
        PartyA: phoneNumber,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: `${process.env.BASE_URL}/payments/callback`,
        AccountReference: bookingId,
        TransactionDesc: "Event Booking Payment",
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    booking.paymentDetails.push({
      transactionId: response.data.CheckoutRequestID, 
      status: "Pending",
      paymentMethod: "M-Pesa"
    });
    await booking.save();

    return response.data;
  } catch (error) {
    console.error("M-Pesa Payment Error:", error);
    throw new Error("M-Pesa Payment Failed");
  }
}

async function handleMpesaCallback(req, res) {
  try {
    const { Body: { stkCallback } } = req.body;
    console.log("M-Pesa Callback Data:", stkCallback);

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // Find the booking using CheckoutRequestID
    let booking = await Booking.findOne({ 
      "paymentDetails.transactionId": CheckoutRequestID 
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (ResultCode === 0) {
      
      const amount = CallbackMetadata.Item.find(item => item.Name === "Amount")?.Value || 0;
      const mpesaReceipt = CallbackMetadata.Item.find(item => item.Name === "MpesaReceiptNumber")?.Value || "";
      const transactionDate = CallbackMetadata.Item.find(item => item.Name === "TransactionDate")?.Value || "";
      const phoneNumber = CallbackMetadata.Item.find(item => item.Name === "PhoneNumber")?.Value || "";

      booking.amountPaid += amount;
      booking.paymentDetails.push({
        amount,
        paymentMethod: "M-Pesa",
        transactionId: mpesaReceipt,
        phoneNumber, // ✅ Store phone number used for payment
        transactionDate: new Date(
          transactionDate.toString().replace(
            /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
            "$1-$2-$3T$4:$5:$6Z"
          )
        ), // ✅ Convert transactionDate to proper Date format
        timestamp: new Date(),
        status: "Success",
        description: "Payment successful"
      });

      // ✅ Update status based on full payment
      booking.status = (booking.amountPaid >= booking.totalAmount) ? "Confirmed" : "Tentative";
    } else {
      // ❌ Payment failed or was canceled
      booking.paymentDetails.push({
        amount: 0,
        paymentMethod: "M-Pesa",
        transactionId: CheckoutRequestID, // Keeps track of the failed transaction
        timestamp: new Date(),
        status: "Failed",
        description: ResultDesc 
      });

      // ✅ Ensure status is set to "Cancelled" if the transaction fails
      booking.status = "Cancelled";
    }

    await booking.save();
    return res.status(200).json({
      message: "Callback processed successfully",
      booking
    });
  } catch (error) {
    console.error("M-Pesa Callback Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}




async function createPayPalOrder(bookingId, userEmail) {
  try {
      const booking = await Booking.findById(bookingId);
      if (!booking) throw new Error("Booking not found");

      const totalAmount = booking.totalAmount;
      if (!totalAmount) throw new Error("Total amount is missing in booking");

      const accessToken = await getPayPalAccessToken();

      const orderData = {
          intent: "CAPTURE",
          purchase_units: [{
              reference_id: bookingId,
              amount: {
                  currency_code: "THB", // Ensure the correct currency is used
                  value: totalAmount.toFixed(2) // Convert to string format required by PayPal
              }
          }],
          application_context: {
              return_url: `http://localhost:3000/bookings`,
              cancel_url: `http://localhost:3000/bookings`
          }
      };

      const response = await axios.post(
          "https://api-m.paypal.com/v2/checkout/orders",
          orderData,
          { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
      );

      const approvalLink = response.data.links.find(link => link.rel === "approve").href;

      // Send the link via email
      await sendApprovalLink(userEmail, approvalLink);

      return response.data;
  } catch (error) {
      console.error("Error creating PayPal order:", error.response?.data || error.message);
      throw new Error("PayPal Order Creation Failed");
  }
}


async function sendApprovalLink(email, approvalLink) {
  let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
          user: process.env.EMAIL_USER, // Load email from .env
          pass: process.env.EMAIL_PASS  // Load password from .env
      }
  });

  let mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "PayPal Payment Authorization",
      text: `Please complete your payment by clicking on the following link: ${approvalLink}`
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${email}`);
  } catch (error) {
      console.error("❌ Error sending email:", error);
  }
}


async function capturePayPalPayment(orderId, bookingId) {
  try {
      const accessToken = await getPayPalAccessToken();
      
      const captureResponse = await axios.post(
          `https://api.paypal.com/v2/checkout/orders/${orderId}/capture`,
          {}, // PayPal requires an empty body for capture
          {
              headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
              }
          }
      );

      console.log("PayPal Capture Response:", JSON.stringify(captureResponse.data, null, 2));

      // Check if the response contains necessary data
      if (!captureResponse.data || !captureResponse.data.purchase_units) {
          throw new Error("Invalid PayPal response structure");
      }

      // Extract payment details
      const paymentDetails = captureResponse.data.purchase_units[0].payments.captures[0];

      if (!paymentDetails || !paymentDetails.amount) {
          throw new Error("Missing payment details in PayPal response");
      }

      return {
          status: paymentDetails.status,
          amount: paymentDetails.amount.value,
          currency: paymentDetails.amount.currency_code,
          transactionId: paymentDetails.id
      };
  } catch (error) {
      console.error("Error capturing PayPal payment:", error.response ? error.response.data : error.message);
      throw new Error("PayPal Payment Capture Failed");
  }
}



async function handlePayPalWebhook(req, res) {
  try {
    const { event_type, resource } = req.body;

    if (event_type === "CHECKOUT.ORDER.APPROVED") {
      const orderId = resource.id;
      const bookingId = resource.purchase_units[0].reference_id;

      // Automatically capture payment
      const paymentCapture = await capturePayPalPayment(orderId, bookingId);

      if (paymentCapture.status === "COMPLETED") {
        let booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        booking.amountPaid += parseFloat(paymentCapture.amount);
        booking.paymentDetails.push({
          amount: paymentCapture.amount,
          paymentMethod: "PayPal",
          transactionId: paymentCapture.transactionId,
          timestamp: new Date(),
          status: "Success",
          description: "Payment successfully captured via PayPal",
        });

        booking.status = booking.amountPaid >= booking.totalAmount ? "Confirmed" : "Tentative";
        await booking.save();

        return res.status(200).json({ message: "Payment captured and booking updated", booking });
      } else {
        return res.status(400).json({ message: "Payment capture failed" });
      }
    }

    return res.status(400).json({ message: "Unhandled event type" });
  } catch (error) {
    console.error("PayPal Webhook Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  try {
      const response = await axios.post(
          "https://api-m.paypal.com/v1/oauth2/token",
          "grant_type=client_credentials",
          {
              headers: {
                  Authorization: `Basic ${auth}`,
                  "Content-Type": "application/x-www-form-urlencoded",
              },
          }
      );
      return response.data.access_token;
  } catch (error) {
      console.error("Error fetching PayPal access token:", error.response?.data || error.message);
      throw new Error("Failed to obtain PayPal access token");
  }
}

module.exports = {
  processMpesaPayment,
  handleMpesaCallback,
  createPayPalOrder,
  capturePayPalPayment, 
  handlePayPalWebhook
};
