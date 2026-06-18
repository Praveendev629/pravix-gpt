// routes/image.js
const express        = require('express');
const router         = express.Router();
const Groq           = require('groq-sdk');
const { protect }    = require('../middleware/authMiddleware');

// ── Groq client (used for prompt enhancement)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Helper: enhance prompt via Groq before sending to image model
async function enhancePrompt(rawPrompt) {
  try {
    const chat = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content:
            'You are a creative image prompt engineer. ' +
            'Given a short idea, expand it into a vivid, detailed image generation prompt (2–3 sentences max). ' +
            'Reply with ONLY the improved prompt, no explanations.',
        },
        { role: 'user', content: rawPrompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    return chat.choices[0]?.message?.content?.trim() || rawPrompt;
  } catch {
    // If Groq fails, fall back to original prompt
    return rawPrompt;
  }
}

// ── POST /api/image/generate
router.post('/generate', protect, async (req, res) => {
  const { prompt, width = 1024, height = 1024, enhance = true } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    // ── Step 1: Optionally enhance the prompt via Groq
    const finalPrompt = enhance ? await enhancePrompt(prompt.trim()) : prompt.trim();

    // ── Step 2: Generate image via Pollinations.ai (free, no API key needed)
    // Docs: https://pollinations.ai/  — returns the image directly at the URL
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const seed          = Math.floor(Math.random() * 1_000_000);
    const imageUrl      = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

    // Verify the URL is reachable (HEAD request)
    // Pollinations generates the image on-the-fly when the URL is requested,
    // so we just return the URL — the client fetches it directly.
    return res.json({
      imageUrl,
      originalPrompt: prompt.trim(),
      enhancedPrompt: finalPrompt,
      width,
      height,
      seed,
      provider: 'pollinations.ai',
    });

  } catch (err) {
    console.error('Image generation error:', err);

    if (err.message?.includes('content_policy')) {
      return res.status(400).json({ error: 'Prompt was rejected by content policy. Please rephrase.' });
    }

    return res.status(500).json({ error: err.message ?? 'Image generation failed' });
  }
});

// ── GET /api/image/generate  (quick URL-based generation — no auth needed)
// Usage: /api/image/generate?prompt=sunset+over+mountains
router.get('/generate', async (req, res) => {
  const { prompt, width = 1024, height = 1024 } = req.query;

  if (!prompt) return res.status(400).json({ error: 'prompt query param is required' });

  const encodedPrompt = encodeURIComponent(prompt);
  const seed          = Math.floor(Math.random() * 1_000_000);
  const imageUrl      = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  return res.json({ imageUrl, prompt, width: Number(width), height: Number(height), seed });
});

module.exports = router;
