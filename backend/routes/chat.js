const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const auth = require("../middleware/auth");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { v4: uuidv4 } = require("uuid");

// ─── ALL FREE GROQ MODELS ─────────────────────────────────────────────
// Get your FREE key at: https://console.groq.com (no credit card needed)
// All of these are free with generous rate limits
const FREE_MODELS = [
  { id: "llama-3.1-8b-instant",             name: "Llama 3.1 8B (Fast - Free)",     vision: false },
  { id: "llama3-8b-8192",                   name: "Llama 3 8B (Free)",               vision: false },
  { id: "llama-3.3-70b-versatile",          name: "Llama 3.3 70B (Best - Free)",     vision: false },
  { id: "gemma2-9b-it",                     name: "Gemma 2 9B (Google - Free)",      vision: false },
  { id: "gemma-7b-it",                      name: "Gemma 7B (Google - Free)",        vision: false },
  { id: "mixtral-8x7b-32768",               name: "Mixtral 8x7B (Long ctx - Free)", vision: false },
  { id: "deepseek-r1-distill-llama-70b",    name: "DeepSeek R1 (Reasoning - Free)", vision: false },
  { id: "deepseek-r1-distill-qwen-32b",     name: "DeepSeek R1 Qwen (Free)",        vision: false },
  { id: "llama-3.2-11b-vision-preview",     name: "Llama Vision 11B (Images - Free)", vision: true },
  { id: "llama-3.2-3b-preview",             name: "Llama 3.2 3B (Fastest - Free)",  vision: false },
];

const SYSTEM_PROMPT = `You are PRAVIX AI, an advanced AI assistant developed by Praveen.
You are helpful, accurate, concise, and friendly.
If anyone asks who developed you, respond: "I was developed by Praveen."
You support markdown formatting, code blocks, and can generate file content.
When generating files, clearly label the content type so it can be downloaded.`;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// GET /api/chat/models - Returns all free models
router.get("/models", auth, (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "GROQ_API_KEY not set in .env",
      fix: "Get your FREE key at https://console.groq.com then add it to backend/.env"
    });
  }
  res.json({ models: FREE_MODELS });
});

// POST /api/chat/stream - Stream AI response
router.post("/stream", auth, async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
  }

  const {
    chatId,
    message,
    model = "llama-3.1-8b-instant", // default to fastest free model
    history = [],
    imageBase64
  } = req.body;

  const userId = req.user.uid;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const finalChatId = chatId || uuidv4();

    // Upsert chat
    await Chat.findOneAndUpdate(
      { chatId: finalChatId },
      { userId, chatId: finalChatId, updatedAt: new Date(), model },
      { upsert: true }
    );

    // Build message array
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-20).map(m => ({ role: m.role, content: m.content }))
    ];

    // Handle vision models
    const modelInfo = FREE_MODELS.find(m => m.id === model);
    if (imageBase64 && modelInfo?.vision) {
      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64 } },
          { type: "text", text: message }
        ]
      });
    } else {
      messages.push({ role: "user", content: message });
    }

    // Save user message
    await Message.create({ chatId: finalChatId, userId, role: "user", content: message });

    // Start streaming from Groq
    send({ type: "start", chatId: finalChatId });

    const stream = await groq.chat.completions.create({
      messages,
      model,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullResponse += delta;
        send({ type: "delta", content: delta });
      }
    }

    // Save assistant message
    await Message.create({ chatId: finalChatId, userId, role: "assistant", content: fullResponse });

    // Auto-title new chats
    const count = await Message.countDocuments({ chatId: finalChatId });
    if (count <= 2) {
      try {
        const titleRes = await groq.chat.completions.create({
          messages: [
            { role: "system", content: "Write a short 4-6 word title for this chat. Only the title, no quotes." },
            { role: "user", content: message }
          ],
          model: "llama-3.2-3b-preview", // fastest model for title generation
          max_tokens: 15
        });
        const title = titleRes.choices[0]?.message?.content?.trim() || "New Chat";
        await Chat.updateOne({ chatId: finalChatId }, { title });
        send({ type: "title", title });
      } catch {}
    }

    send({ type: "done", chatId: finalChatId });
    res.end();
  } catch (err) {
    console.error("Groq error:", err.message);
    let errorMsg = err.message;
    if (err.status === 401) errorMsg = "Invalid Groq API key. Check your GROQ_API_KEY in .env";
    if (err.status === 429) errorMsg = "Rate limit hit. Wait a moment and try again.";
    if (err.status === 404) errorMsg = `Model '${req.body.model}' not found. Try llama-3.1-8b-instant`;
    send({ type: "error", error: errorMsg });
    res.end();
  }
});

module.exports = router;
