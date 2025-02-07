const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema(
  {
    eventRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRequest",
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentMethod: {
      type: String,
      enum: ["PayPal", "M-Pesa"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
    remainingBalance: {
      type: Number,
      required: true,
    },
    transactionId: {
      type: String, 
      unique: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Deposit = mongoose.model("Deposit", depositSchema);
module.exports = Deposit;
