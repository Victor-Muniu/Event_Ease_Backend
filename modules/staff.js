const mongoose = require("mongoose");
const StaffSchema = new mongoose.Schema(
  {
    emp_no: {
      type: String,
      required: true,
      unique: true,
    },
    fname: {
      type: String,
      required: true,
    },
    lname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["Admin", "Event Manager"],
    },

    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);


const Staff = mongoose.model("Staff", StaffSchema);

module.exports = Staff;
