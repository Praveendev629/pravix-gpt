const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

router.post("/sync", auth, async (req, res) => {
  try {
    const { name, email, profilePhoto, provider } = req.body;
    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { uid: req.user.uid, name, email, profilePhoto, provider },
      { upsert: true, new: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/theme", auth, async (req, res) => {
  try {
    await User.updateOne({ uid: req.user.uid }, { theme: req.body.theme });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
