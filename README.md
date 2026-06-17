# Pravix GPT — Full Stack AI Platform

> **Developed by Praveen**
> An advanced AI assistant platform with a built-in VS Code-like coding workspace.

---

## Project Structure

```
pravix-gpt/
├── backend/              Node.js + Express API (Vercel Serverless)
├── frontend-web/         Next.js 14 web application
├── frontend-mobile/      Expo React Native Android/iOS app
└── README.md
```

---

## Features

- **AI Chat** — Streaming responses, chat history, markdown/code rendering
- **Coding Workspace** — VS Code-like editor (CodeMirror 6), live preview, file manager, AI code generation
- **Authentication** — Google OAuth, Mobile OTP (Firebase), Email/Password
- **OTP UX** — 6-box OTP inputs turn green with tick on verification
- **Session Usernames** — Phone-login users set a chat display name (session only, not stored in DB)
- **Persistent Projects** — MongoDB-backed project workspace with version history
- **AI Code Actions** — Explain, Fix, Optimize, Refactor, Comment, Convert
- **AI Project Generator** — Describe a project, AI generates full structure

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Engine | Groq (llama-3.3-70b-versatile) |
| Web | Next.js 14, Tailwind CSS, CodeMirror 6 |
| Mobile | Expo SDK 50, React Native |
| Backend | Node.js, Express, MongoDB (Mongoose) |
| Auth | Firebase (Google OAuth + Phone OTP) + JWT |
| Hosting | Vercel (web + backend) |
| DB | MongoDB Atlas |

---

## Setup Guide

### Prerequisites
- Node.js 18+
- Python 3.9+ (for running generator script)
- MongoDB Atlas account (free tier works)
- Firebase project
- Groq API key (free at console.groq.com)
- Vercel account

---

### Step 1 — Firebase Setup & Getting SHA-1

#### 1a. Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → Name it `pravix-gpt`
3. Enable **Google Analytics** (optional) → Create Project

#### 1b. Enable Authentication
1. In Firebase console → **Authentication** → **Sign-in method**
2. Enable **Google** provider → Add your support email → Save
3. Enable **Phone** provider → Save

#### 1c. Get SHA-1 for Android (Google Auth)

**Method 1 — Debug keystore (for development):**
```bash
# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Method 2 — EAS Build (for production):**
```bash
npm install -g eas-cli
eas login
eas credentials
# Select Android → your app → show keystore → copy SHA-1
```

#### 1d. Add SHA-1 to Firebase
1. Firebase Console → Project Settings (gear icon) → Your Apps
2. Click **Add app** → Android
3. Package name: `com.pravix.gpt`
4. Paste your SHA-1 → Register App
5. Download `google-services.json` → place in `frontend-mobile/`

#### 1e. Web App Setup
1. Firebase Console → Project Settings → Add app → Web
2. Register app name → Copy config values

#### 1f. Generate Firebase Admin SDK Key
1. Firebase Console → Project Settings → **Service Accounts**
2. Click **Generate new private key** → Download JSON
3. Extract `project_id`, `private_key`, `client_email` for backend `.env`

---

### Step 2 — Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / Login
3. API Keys → **Create API Key**
4. Copy the key → paste as `GROQ_API_KEY` in backend `.env`

---

### Step 3 — MongoDB Atlas

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free cluster
2. Database Access → Add user with password
3. Network Access → Allow `0.0.0.0/0`
4. Connect → Drivers → Copy connection string
5. Replace `<password>` with your password → set as `MONGODB_URI`

---

### Step 4 — Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev          # Local development
```

**Deploy to Vercel:**
```bash
npm install -g vercel
vercel login
cd backend
vercel --prod
# Copy the deployment URL (e.g. https://pravix-backend.vercel.app)
```

---

### Step 5 — Frontend Web Setup

```bash
cd frontend-web
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend Vercel URL
# Set all NEXT_PUBLIC_FIREBASE_* values
npm install
npm run dev          # http://localhost:3000
```

**Deploy to Vercel:**
```bash
cd frontend-web
vercel --prod
```

---

### Step 6 — Frontend Mobile Setup

```bash
cd frontend-mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL and Firebase values
npm install
npx expo start       # Scan QR with Expo Go app
```

**Build APK:**
```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

---

## Environment Variables Reference

### Backend `.env`
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random 64 char string>
JWT_REFRESH_SECRET=<random 64 char string>
GROQ_API_KEY=gsk_...
FIREBASE_PROJECT_ID=pravix-gpt
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@pravix-gpt.iam.gserviceaccount.com
CLIENT_URL=https://your-web-app.vercel.app
PORT=5000
```

### Frontend Web `.env.local`
```
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pravix-gpt.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pravix-gpt
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
```

---

## Authentication Flows

### Google OAuth
1. User clicks "Continue with Google"
2. Firebase `signInWithPopup` → Google consent screen
3. Firebase ID token sent to `/api/auth/firebase`
4. Backend verifies with Firebase Admin SDK
5. User created/found in MongoDB with Google name
6. JWT issued → user redirected to `/chat` with Google display name

### Mobile OTP
1. User enters phone + country code → "Send OTP"
2. Firebase `signInWithPhoneNumber` → SMS sent
3. User enters 6-digit OTP → boxes turn GREEN with tick animation
4. Firebase `confirmationResult.confirm(otp)` → verified
5. Firebase ID token stored → redirect to `/auth/username`
6. User enters chat display name (session only, NOT saved to DB)
7. Backend creates/finds user account → JWT issued → redirect to `/chat`

### Email/Password
1. Standard signup/login flow
2. Password hashed with bcrypt (12 rounds)
3. JWT issued on success

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/signup | Email signup |
| POST | /api/auth/login | Email login |
| POST | /api/auth/firebase | Google/Phone Firebase auth |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/refresh | Refresh JWT |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/chat | List chats |
| POST | /api/chat | Create chat |
| GET | /api/chat/:id/messages | Get messages |
| POST | /api/chat/:id/message | Send message (streaming) |
| DELETE | /api/chat/:id | Delete chat |
| PATCH | /api/chat/:id | Rename chat |
| PATCH | /api/chat/:id/pin | Pin/unpin chat |

### Workspace
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/workspace/projects | List projects |
| POST | /api/workspace/projects | Create project |
| GET | /api/workspace/projects/:id | Get project with files |
| PATCH | /api/workspace/projects/:id/file | Update file content |
| POST | /api/workspace/projects/:id/file | Add file/folder |
| DELETE | /api/workspace/projects/:id | Delete project |
| POST | /api/workspace/generate | AI code generation (streaming) |
| POST | /api/workspace/generate-project | AI full project generation |
| POST | /api/workspace/projects/:id/snapshot | Save version |

---

## Coding Workspace Features

- **Code Editor**: CodeMirror 6 with syntax highlighting for 16+ languages
- **Live Preview**: Real-time iframe preview for HTML/CSS/JS projects
- **Responsive Preview**: Desktop / Tablet / Mobile viewport simulation
- **File Manager**: VS Code-style tree with create/delete/rename
- **AI Generate**: Describe what to code → AI writes it
- **AI Assistant**: Explain, Fix Bugs, Optimize, Refactor, Add Comments, Generate Docs, Convert Language
- **AI Project Generator**: Describe a full app → AI generates all files
- **Version History**: Save snapshots, restore old versions
- **Code Actions**: Copy, Download, Save, Export Project

---

## Security Notes

- Passwords hashed with bcrypt (12 rounds)
- JWT expiry: 7 days (access) / 30 days (refresh)
- Rate limiting: 200 requests per 15 minutes
- Firebase Admin SDK validates all OAuth/OTP tokens server-side
- Chat usernames (phone login) are session-only, never persisted
- XSS protection via Helmet

---

*Developed by Praveen — Pravix GPT v1.0.0*
