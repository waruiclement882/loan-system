const express = require("express");
const cors = require("cors");

const customerRoutes = require("./routes/customers");
const loanRoutes = require("./routes/loans");
const paymentRoutes = require("./routes/payments");
const mpesaRoutes = require("./routes/mpesa");
const authRoutes = require("./routes/auth");
const pricingRoutes = require("./routes/pricingRoutes");
const webhookRoutes = require("./routes/webhooks");
const usersRoute = require("./routes/users");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Microfinance server is running");
});

app.use("/api/customers", customerRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", pricingRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/api/auth", usersRoute);

module.exports = app;
