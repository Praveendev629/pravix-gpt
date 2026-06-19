const mongoose = require("mongoose");
const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  chatId: { type: String, required: true, unique: true },
  title: { type: String, default: "New Chat" },
  model: { type: String, default: "llama-3.3-70b-versatile" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Chat", ChatSchema);
