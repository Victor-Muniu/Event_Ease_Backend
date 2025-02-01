const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const StaffRouter = require("./routes/staffRouter");
const EventGroundRouter = require("./routes/eventGroundsRouter");
const AssetRouter = require("./routes/assetsRouter")
const EventOrganizerRouter = require("./routes/eventOrganizerRouter")
const LoginRouter = require('./routes/login')
const EventsRouter = require('./routes/eventsRouter')
const UserRouter = require('./routes/userRouter')
const EventsGroundsRequest = require('./routes/eventGroundRequest')
const EventResponseRouter = require('./routes/eventsResponseRouter')
const TicketsRouter = require('./routes/ticketsRouter')
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
  .connect(
    "mongodb+srv://victornjoroge4971:pnlvmn4971@nexacorp.vthn4.mongodb.net/eventEase"
  )
  .then(() => console.log("Connected to MongoDB successfully."))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

app.use("", StaffRouter);
app.use("", EventGroundRouter)
app.use("", AssetRouter)
app.use("", EventOrganizerRouter)
app.use("", LoginRouter)
app.use("",EventsRouter)
app.use("", UserRouter)
app.use("", EventsGroundsRequest)
app.use("", EventResponseRouter)
app.use("", TicketsRouter)
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
