const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'New Conversation' },
  isPinned: { type: Boolean, default: false },
  messageCount: { type: Number, default: 0 },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  model: { type: String, default: 'llama-3.3-70b-versatile' },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
