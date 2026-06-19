const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const OTP = require("../models/OTP");
const User = require("../models/User");

// Gmail SMTP transporter (100% free using Gmail App Password)
const createTransporter = () => nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Generate 6-digit OTP
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// ─── POST /api/otp/send ───────────────────────────────────────────────
// Called right after user registers with Firebase
router.post("/send", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const otp = generateOTP();

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email });

    // Save new OTP to DB (auto-expires in 10 min)
    await OTP.create({ email, otp });

    // Send email via Gmail SMTP
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"PRAVIX AI" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your PRAVIX AI Verification Code",
      html: `
        <div style="font-family:Arial,sans-serif;background:#000;color:#fff;padding:32px;border-radius:16px;max-width:480px;margin:auto">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#8B5CF6;font-size:28px;margin:0;letter-spacing:2px">PRAVIX AI</h1>
            <p style="color:#666;margin:8px 0 0">Email Verification</p>
          </div>
          <p style="color:#ccc;margin-bottom:8px">Your verification code is:</p>
          <div style="display:flex;gap:8px;justify-content:center;margin:24px 0">
            ${otp.split("").map(d => `
              <div style="width:48px;height:56px;background:#1a1a2e;border:2px solid #8B5CF6;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;text-align:center;line-height:56px">${d}</div>
            `).join("")}
          </div>
          <p style="color:#666;font-size:13px;text-align:center">This code expires in <strong style="color:#8B5CF6">10 minutes</strong>.</p>
          <p style="color:#444;font-size:12px;text-align:center;margin-top:24px">If you did not request this, please ignore this email.</p>
          <p style="color:#333;font-size:11px;text-align:center;margin-top:32px">Developed By Praveen</p>
        </div>
      `
    });

    console.log(`OTP sent to ${email}: ${otp}`); // remove in production
    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ error: "Failed to send OTP. Check your Gmail App Password in .env" });
  }
});

// ─── POST /api/otp/verify ─────────────────────────────────────────────
router.post("/verify", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

  try {
    const record = await OTP.findOne({ email });

    if (!record) {
      return res.status(400).json({ error: "OTP expired or not found. Please request a new one." });
    }

    if (record.otp !== otp.toString()) {
      return res.status(400).json({ error: "Incorrect OTP. Please try again." });
    }

    // OTP is valid - mark user as verified
    await OTP.deleteMany({ email });
    await User.findOneAndUpdate({ email }, { emailVerified: true });

    res.json({ success: true, message: "Email verified successfully!" });
  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/otp/resend ─────────────────────────────────────────────
router.post("/resend", async (req, res) => {
  // Reuse the send endpoint logic
  req.url = "/send";
  router.handle(req, res);
});

module.exports = router;
