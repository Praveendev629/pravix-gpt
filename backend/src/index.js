require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const connectDB  = require('./config/db');

// ── Route imports
const authRoutes      = require('./routes/auth');
const chatRoutes      = require('./routes/chat');
const workspaceRoutes = require('./routes/workspace');
const userRoutes      = require('./routes/user');
const imageRoutes     = require('./routes/image'); // ✅ import only — do NOT register yet

const app = express();

app.set('trust proxy', 1);

// ── Security middleware (must come first)
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const allowed = [
      process.env.CLIENT_URL?.replace(/\/$/, ''),
      'https://pravix-gpt.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
    ].filter(Boolean);

    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      // In production allow all origins from vercel.app preview URLs
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// ── Body parsers  ← imageRouter needs this, so must be BEFORE route registration
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check (no DB needed)
app.get('/', (_req, res) =>
  res.json({ status: 'Pravix GPT API Running', version: '1.0.0' })
);

// ── DB connection middleware (applied to all /api routes)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB unavailable for request:', err.message);
    res.status(503).json({
      error: 'Service temporarily unavailable. Please try again.',
    });
  }
});

// ── Routes  ← ALL registered after middleware
app.use('/api/auth',      authRoutes);
app.use('/api/chat',      chatRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/user',      userRoutes);
app.use('/api/image',     imageRoutes); // ✅ now gets body parser + CORS + helmet + rate limit + DB

// ── Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Pravix GPT API running on port ${PORT}`));
}

module.exports = app;
