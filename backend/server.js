require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const admin = require("firebase-admin");

const app = express();

// Firebase Admin
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  if (serviceAccount.project_id) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("Firebase Admin initialized");
  } else {
    console.warn("WARNING: FIREBASE_SERVICE_ACCOUNT not set - auth middleware will be disabled");
  }
} catch (e) {
  console.warn("Firebase Admin init error:", e.message);
}

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err.message));

// Routes
app.use("/api/otp", require("./routes/otp"));           // No auth needed (for registration)
app.use("/api/chat", require("./routes/chat"));
app.use("/api/history", require("./routes/history"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/user", require("./routes/user"));

// Health check
app.get("/", (req, res) => res.json({
  status: "PRAVIX AI Backend Running",
  groq: process.env.GROQ_API_KEY ? "Connected" : "MISSING - Add GROQ_API_KEY to .env",
  gmail: process.env.GMAIL_USER ? `Connected (${process.env.GMAIL_USER})` : "MISSING - Add GMAIL_USER and GMAIL_APP_PASSWORD to .env",
  mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\nPRAVIX AI Backend running on http://localhost:${PORT}`);
  console.log("Health check: http://localhost:" + PORT + "/");
  if (!process.env.GROQ_API_KEY) console.warn("  GROQ_API_KEY missing! Add it to .env");
  if (!process.env.GMAIL_USER) console.warn("  GMAIL credentials missing! Add to .env");
});
