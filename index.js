require('dotenv').config()
const express = require("express");
const logger = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

//const currency = require("./routes/CurrencyService");
const auth = require("./routes/auth");
const newsLetter = require("./routes/SendNewsLetter");

app.use(cors())

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
 });

app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.set("strictQuery", false);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      //useNewUrlParser: true,
      //useUnifiedTopology: true
    });
    console.log("Db Connected");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

// Connect to the database
connectDB();

// Routes
app.use("/api/auth", auth);
app.use("/api/newsLetter", newsLetter);

app.get("/", function (req, res) {
  res.json({ homeresponse: "Welcome" });
});

app.listen(port, function () {
  console.log(`Server Up and running on Port ${port}`);
});
