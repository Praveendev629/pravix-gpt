const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, index: true },
  profilePhoto: String,
  provider: String,
  theme: { type: String, default: "purple" },
  emailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("User", UserSchema);
