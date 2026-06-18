// routes/image.js
const express    = require('express');
const router     = express.Router();
const OpenAI     = require('openai');
const cloudinary = require('cloudinary').v2;
const authMiddleware = require('../middleware/auth');

// ── Clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,  // server-side only — never expose to client
});

// ── POST /api/image/generate
router.post('/generate', authMiddleware, async (req, res) => {
  const { prompt, userId } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    // ── Step 1: Generate image with DALL-E 3
    const aiResp = await openai.images.generate({
      model:   'dall-e-3',
      prompt:  prompt.trim(),
      n:       1,              // DALL-E 3 only supports n=1
      size:    '1024x1024',
      quality: 'standard',
    });

    const tempUrl = aiResp.data[0].url;
    if (!tempUrl) throw new Error('OpenAI returned no image URL');

    // ── Step 2: Upload to Cloudinary from the temp URL
    // NOTE: Do NOT pass upload_preset here — that's for unsigned (client-side) uploads.
    //       When api_secret is configured the upload is already signed automatically.
    const uploaded = await cloudinary.uploader.upload(tempUrl, {
      folder:  'pravix-gpt/ai-generated',
      tags:    ['ai-generated', `user:${userId ?? 'anonymous'}`],
      // ✅ context as object — safe even if prompt contains = or | characters
      context: {
        prompt:  prompt.slice(0, 200),
        user_id: userId ?? 'anonymous',
      },
    });

    // ── Step 3 (optional): Save to DB
    // await ImageModel.create({
    //   userId,
    //   prompt,
    //   publicId: uploaded.public_id,
    //   url:      uploaded.secure_url,
    //   width:    uploaded.width,
    //   height:   uploaded.height,
    // });

    return res.json({
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      prompt:   prompt.trim(),
      width:    uploaded.width,
      height:   uploaded.height,
    });

  } catch (err) {
    console.error('Image generation error:', err);

    // Give a clear message for common errors
    if (err.message?.includes('billing')) {
      return res.status(402).json({ error: 'OpenAI billing issue — check your API key usage limits.' });
    }
    if (err.message?.includes('content_policy')) {
      return res.status(400).json({ error: 'Prompt was rejected by content policy. Please rephrase.' });
    }

    return res.status(500).json({ error: err.message ?? 'Image generation failed' });
  }
});

module.exports = router;
