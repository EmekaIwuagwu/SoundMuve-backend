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
const newsLetter = require("./routes/NewsLetter");
const release = require("./routes/Release");
const transactions = require("./routes/TransactionManager");
const payouts = require("./routes/Payouts");
const songs = require("./routes/Song");
const recordLabel = require("./routes/RecordLabel");
const payoutDetails = require("./routes/PayoutDetails");
const currency = require("./routes/CurrencyManager");
const initiateTransaction = require("./routes/transactionInit");
const analytics = require("./routes/Analytics");
const analyticsRoutes = require("./routes/AnalyticsManager");
const kycRoutes = require("./routes/kycRoutes");
const search = require("./routes/searchRoutes");
const musicDist = require("./routes/MusicDistribution");
const checkout = require("./routes/PayPerRelease");
const revisedAnalytics = require("./routes/RevisedAnalyticsData");
const promotions = require("./routes/promotions");


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
app.use("/api/Release", release);
app.use("/api/wallet", transactions);
app.use("/api/songs", songs);
app.use("/api/payouts", payouts);
app.use("/api/currency", currency);
app.use("/api/recordLabel", recordLabel);
app.use("/api/payoutDetails", payoutDetails);
app.use("/api/transactionInit", initiateTransaction);
app.use("/api/analytics", analytics);
app.use("/api/analyticsManager", analyticsRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/search", search);
app.use("/api/musicDist", musicDist);
app.use("/api/checkout", checkout);
app.use("/api/revisedAnalytics",revisedAnalytics);
app.use("/api/promotions",promotions);

app.get("/", function (req, res) {
  res.json({ homeresponse: "Welcome :)" });
});

app.listen(port, function () {
  console.log(`Server Up and running on Port ${port}`);
});
