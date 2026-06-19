# PRAVIX AI

Full-stack AI chat application.

## Stack
- **Web**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion
- **Mobile**: Expo SDK 52, TypeScript, Expo Router 4
- **Backend**: Node.js, Express, MongoDB Atlas, Vercel
- **Auth**: Firebase Authentication
- **AI**: Groq API (Llama, DeepSeek, Gemma, Qwen)

## Setup

### 1. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2. Web
```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

### 3. Mobile
```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

## Required API Keys
- Groq API Key: https://console.groq.com
- Firebase Project: https://console.firebase.google.com
- MongoDB Atlas URI: https://cloud.mongodb.com
- Google OAuth Client ID (for Google Sign-In)
