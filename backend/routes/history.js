const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

// GET all chats for user
router.get("/", auth, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.uid })
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET messages for a chat
router.get("/:chatId/messages", auth, async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .sort({ timestamp: 1 });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE chat
router.delete("/:chatId", auth, async (req, res) => {
  try {
    await Chat.deleteOne({ chatId: req.params.chatId, userId: req.user.uid });
    await Message.deleteMany({ chatId: req.params.chatId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH rename chat
router.patch("/:chatId", auth, async (req, res) => {
  try {
    await Chat.updateOne(
      { chatId: req.params.chatId, userId: req.user.uid },
      { title: req.body.title }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
