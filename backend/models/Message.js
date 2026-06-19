const mongoose = require("mongoose");
const MessageSchema = new mongoose.Schema({
  chatId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  role: { type: String, enum: ["user", "assistant", "system"], required: true },
  content: { type: String, required: true },
  fileUrl: { type: String },
  fileType: { type: String },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Message", MessageSchema);
