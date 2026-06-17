const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const admin = require('../config/firebase');
const { protect } = require('../middleware/authMiddleware');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const signRefresh = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

// ── Email signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({ name, email, passwordHash: password, authProvider: 'email', isVerified: false });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, authProvider: 'email' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Email login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, profilePhoto: user.profilePhoto, authProvider: user.authProvider } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Google / Firebase ID token → issue JWT
router.post('/firebase', async (req, res) => {
  try {
    const { idToken, chatUsername } = req.body;
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture, phone_number, firebase } = decoded;
    const provider = firebase?.sign_in_provider === 'phone' ? 'phone' : 'google';

    let user = await User.findOne({ $or: [{ firebaseUid: uid }, ...(email ? [{ email }] : []), ...(phone_number ? [{ phone: phone_number }] : [])] });

    if (!user) {
      user = await User.create({
        name: provider === 'google' ? (name || 'User') : (chatUsername || 'User'),
        email: email || undefined,
        phone: phone_number || undefined,
        googleId: provider === 'google' ? uid : undefined,
        firebaseUid: uid,
        profilePhoto: picture || '',
        authProvider: provider,
        isVerified: true,
      });
    } else {
      user.lastLogin = new Date();
      user.firebaseUid = uid;
      if (picture && !user.profilePhoto) user.profilePhoto = picture;
      if (provider === 'google' && name) user.name = name;
      await user.save();
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, profilePhoto: user.profilePhoto, authProvider: user.authProvider },
      chatUsername: provider === 'phone' ? chatUsername : user.name,
    });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

// ── Me
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

// ── Refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'Invalid refresh token' });
    const newToken = signToken(user._id);
    res.json({ token: newToken });
  } catch { res.status(401).json({ error: 'Refresh token expired' }); }
});

module.exports = router;
