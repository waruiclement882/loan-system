require("dotenv").config();
const express = require("express");

const pricingRoutes = require("./src/routes/pricingRoutes");

const app = express();

app.use(express.json());

app.use("/api", pricingRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});