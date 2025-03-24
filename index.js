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
const EventRouter = require("./router/eventRouter")
const UserRouter = require("./router/userRouter")
const LoginUser = require("./auth/userLogin")
const TicketRouter = require("./router/ticketRouter")
const updateEventStatuses = require("./utils/eventStatusUpdater");

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
app.use("", EventRouter)
app.use("", UserRouter)
app.use("", LoginUser)
app.use("", TicketRouter)
updateEventStatuses();
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
