const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

router.get('/profile', protect, (req, res) => res.json(req.user));

router.patch('/profile', protect, async (req, res) => {
  try {
    const { name, themePreference } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (themePreference) updates.themePreference = themePreference;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/account', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
