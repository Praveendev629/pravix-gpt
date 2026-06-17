require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const workspaceRoutes = require('./routes/workspace');
const userRoutes = require('./routes/user');

const app = express();

// ── Required for Vercel / any reverse-proxy (fixes express-rate-limit warnings)
app.set('trust proxy', 1);

// ── Connect DB (cached — safe for serverless)
connectDB().catch((err) => console.error('Initial DB connect failed:', err.message));

// ── Security
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// ── Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health
app.get('/', (_req, res) => res.json({ status: 'Pravix GPT API Running', version: '1.0.0' }));

// ── Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/user', userRoutes);

// ── Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Only bind a port when running locally (not on Vercel serverless)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Pravix GPT API running on port ${PORT}`));
}

module.exports = app;
