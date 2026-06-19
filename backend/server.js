require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const admin = require("firebase-admin");

const app = express();

// ─── Firebase Admin ───────────────────────────────────────────────────
try {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  if (sa.project_id && !admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    console.log("Firebase Admin initialized");
  }
} catch (e) {
  console.warn("Firebase Admin init skipped:", e.message);
}

// ─── Middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ─── Connect DB before every request (handles Vercel serverless) ──────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({
      error: "Database unavailable. Fix: Go to MongoDB Atlas → Network Access → Allow 0.0.0.0/0",
      detail: err.message
    });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────
app.use("/api/otp",     require("./routes/otp"));
app.use("/api/chat",    require("./routes/chat"));
app.use("/api/history", require("./routes/history"));
app.use("/api/upload",  require("./routes/upload"));
app.use("/api/user",    require("./routes/user"));

// ─── Health Check ─────────────────────────────────────────────────────
app.get("/", async (req, res) => {
  const { connection } = require("mongoose");
  res.json({
    status: "PRAVIX AI Backend Running",
    groq:    process.env.GROQ_API_KEY    ? "Connected" : "MISSING — add GROQ_API_KEY in Vercel Settings",
    gmail:   process.env.GMAIL_USER      ? `Connected (${process.env.GMAIL_USER})` : "MISSING — add GMAIL_USER in Vercel Settings",
    mongodb: connection.readyState === 1 ? "Connected" : "DISCONNECTED — allow 0.0.0.0/0 in Atlas Network Access",
    firebase: process.env.FIREBASE_SERVICE_ACCOUNT ? "Configured" : "MISSING"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`PRAVIX AI running on port ${PORT}`));

module.exports = app;
