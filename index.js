const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const StaffRouter = require("./router/staffRouter");
const StaffLogin = require('./auth/staffLogin')
const VenueRouter = require('./router/venueRouter')
const EquipmentRouter = require('./router/equipmentRouter')
const EventOrganizer = require('./router/eventOrganizerRouter')
const eventOrganizerLogin = require('./auth/eventOrganizerLogin')
const VenueRequest = require('./router/venueRequestRouter')
const VenueRequestResponse = require('./router/venueResponseRouter')
const BookingRouter = require('./router/bookingRouter')
dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB successfully."))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

app.use("", StaffRouter);
app.use("",StaffLogin)
app.use("", VenueRouter)
app.use("", EquipmentRouter)
app.use("", EventOrganizer)
app.use("", eventOrganizerLogin)
app.use("", VenueRequest)
app.use("", VenueRequestResponse)
app.use("", BookingRouter);


const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
