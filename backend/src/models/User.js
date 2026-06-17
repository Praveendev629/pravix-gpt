const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, sparse: true, lowercase: true, trim: true },
  phone: { type: String, sparse: true, trim: true },
  passwordHash: { type: String },
  googleId: { type: String, sparse: true },
  firebaseUid: { type: String, sparse: true },
  profilePhoto: { type: String, default: '' },
  authProvider: { type: String, enum: ['email', 'google', 'phone'], default: 'email' },
  isVerified: { type: Boolean, default: false },
  themePreference: { type: String, default: 'purple-red-black' },
  aiUsageCount: { type: Number, default: 0 },
  subscriptionStatus: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  lastLogin: { type: Date, default: Date.now },
  refreshTokens: [{ type: String }],
}, { timestamps: true });

userSchema.methods.comparePassword = async function (plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && this.passwordHash && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
