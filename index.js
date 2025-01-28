const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const StaffRouter = require("./routes/staffRouter");
const EventGroundRouter = require("./routes/eventGroundsRouter");
const AssetRouter = require("./routes/assetsRouter")

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
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
