const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const auth = require("../middleware/auth");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { v4: uuidv4 } = require("uuid");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are PRAVIX AI, an advanced AI assistant developed by Praveen.
You are helpful, accurate, and concise.
If anyone asks who developed you, respond: "I was developed by Praveen."
You support markdown formatting, code blocks, and file generation.
When generating files (PDF, DOCX, XLSX, PPTX, CSV, TXT, JSON, HTML, CSS, JavaScript, Python),
output the content clearly marked with the file type so it can be downloaded.`;

const MODELS = {
  "llama-3.3-70b-versatile": "Llama 3.3 70B",
  "llama-3.1-8b-instant": "Llama 3.1 8B",
  "deepseek-r1-distill-llama-70b": "DeepSeek R1",
  "gemma2-9b-it": "Gemma 2 9B",
  "qwen-qwq-32b": "Qwen QwQ 32B",
  "meta-llama/llama-4-scout-17b-16e-instruct": "Llama 4 Scout",
  "llama-3.2-11b-vision-preview": "Llama Vision 11B"
};

// POST /api/chat/stream
router.post("/stream", auth, async (req, res) => {
  const { chatId, message, model = "llama-3.3-70b-versatile", history = [], imageBase64 } = req.body;
  const userId = req.user.uid;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let finalChatId = chatId || uuidv4();

    // Create or update chat
    await Chat.findOneAndUpdate(
      { chatId: finalChatId },
      { userId, chatId: finalChatId, updatedAt: new Date(), model },
      { upsert: true }
    );

    // Build messages
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-20).map(m => ({ role: m.role, content: m.content }))
    ];

    // Handle vision
    if (imageBase64 && (model.includes("vision") || model.includes("llama-4"))) {
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

    // Stream from Groq
    const stream = await groq.chat.completions.create({
      messages,
      model,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7
    });

    let fullResponse = "";
    res.write(`data: ${JSON.stringify({ chatId: finalChatId, type: "start" })}\n\n`);

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`);
      }
    }

    // Save assistant message
    await Message.create({ chatId: finalChatId, userId, role: "assistant", content: fullResponse });

    // Auto-generate title if new chat
    const msgCount = await Message.countDocuments({ chatId: finalChatId });
    if (msgCount <= 2) {
      const titleRes = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "Generate a short 4-6 word title for this chat. Only output the title, nothing else." },
          { role: "user", content: message }
        ],
        model: "llama-3.1-8b-instant",
        max_tokens: 20
      });
      const title = titleRes.choices[0]?.message?.content?.trim() || "New Chat";
      await Chat.updateOne({ chatId: finalChatId }, { title });
    }

    res.write(`data: ${JSON.stringify({ type: "done", chatId: finalChatId })}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/chat/models
router.get("/models", auth, (req, res) => {
  res.json({ models: Object.entries(MODELS).map(([id, name]) => ({ id, name })) });
});

module.exports = router;
