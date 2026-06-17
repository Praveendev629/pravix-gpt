const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── List chats
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id }).sort({ lastMessageAt: -1 });
    res.json(chats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Create chat
router.post('/', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await Chat.create({ userId: req.user._id, title: title || 'New Conversation' });
    res.status(201).json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Get messages
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const messages = await Message.find({ chatId: req.params.id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Send message (streaming)
router.post('/:id/message', protect, async (req, res) => {
  try {
    const { content, chatUsername } = req.body;
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Save user message
    await Message.create({ chatId: chat._id, userId: req.user._id, role: 'user', content });

    // Fetch recent history
    const history = await Message.find({ chatId: chat._id }).sort({ createdAt: -1 }).limit(20);
    const messages = history.reverse().map(m => ({ role: m.role, content: m.content }));

    // System prompt (no mention of groq/model brand)
    const systemPrompt = `You are Pravix AI, an advanced intelligent assistant. You are helpful, precise, and creative. You support code generation, analysis, writing, and reasoning. When generating code, always format it in proper markdown code blocks. The user's display name for this session is: ${chatUsername || req.user.name}.`;

    // Streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    // Save assistant message
    const assistantMsg = await Message.create({ chatId: chat._id, userId: req.user._id, role: 'assistant', content: fullContent });

    // Update chat
    const firstUserMsg = await Message.findOne({ chatId: chat._id, role: 'user' });
    if (firstUserMsg && chat.title === 'New Conversation') {
      chat.title = content.slice(0, 60);
    }
    chat.lastMessage = fullContent.slice(0, 100);
    chat.lastMessageAt = new Date();
    chat.messageCount += 2;
    await chat.save();

    // Update usage
    await User.findByIdAndUpdate(req.user._id, { $inc: { aiUsageCount: 1 } });

    res.write(`data: ${JSON.stringify({ done: true, messageId: assistantMsg._id })}\n\n`);
    res.end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Delete chat
router.delete('/:id', protect, async (req, res) => {
  try {
    await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    await Message.deleteMany({ chatId: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Rename chat
router.patch('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title },
      { new: true }
    );
    res.json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Pin/unpin
router.patch('/:id/pin', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    chat.isPinned = !chat.isPinned;
    await chat.save();
    res.json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
