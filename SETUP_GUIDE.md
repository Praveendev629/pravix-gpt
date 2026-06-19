# PRAVIX AI — Setup Guide

## STEP 1: Get Your FREE Groq API Key

1. Go to **https://console.groq.com** (no credit card needed)
2. Sign up with Google or email
3. Click **"API Keys"** in the left sidebar
4. Click **"Create API Key"** → name it "PRAVIX AI"
5. Copy the key that starts with **`gsk_`**
6. Paste it in `backend/.env` as `GROQ_API_KEY=gsk_your_key_here`

**All Groq models are FREE with generous rate limits:**
- Llama 3.1 8B — fastest
- Llama 3.3 70B — most capable
- Gemma 2 9B — Google model
- Mixtral 8x7B — long context
- DeepSeek R1 — best reasoning
- Llama Vision 11B — image analysis

---

## STEP 2: Set Up Gmail OTP (FREE)

This is what sends the 6-digit verification code to new users.

1. Use any **Gmail account** you own
2. Go to **https://myaccount.google.com/security**
3. Enable **"2-Step Verification"** (must do this first)
4. Go to **https://myaccount.google.com/apppasswords**
5. Select App: **"Mail"**, Device: **"Other"** → type "PRAVIX AI"
6. Click **Generate**
7. Copy the **16-character password** shown (like `abcd efgh ijkl mnop`)
8. Add to `backend/.env`:
   ```
   GMAIL_USER=yourgmail@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

> The app password is different from your Gmail login password.
> Remove the spaces when pasting it.

---

## STEP 3: Firebase Setup

1. Go to **https://console.firebase.google.com**
2. Create a new project (or use existing)
3. Enable **Authentication** → Sign-in methods:
   - Email/Password → Enable
   - Google → Enable
4. Get Web Config:
   - Project Settings → General → Your Apps → Web App
   - Copy the config values to `web/.env.local` and `mobile/.env`
5. Get Service Account (for backend):
   - Project Settings → Service Accounts → Generate new private key
   - Download the JSON file
   - Copy the entire JSON content and paste as `FIREBASE_SERVICE_ACCOUNT` in `backend/.env`

---

## STEP 4: MongoDB Atlas (FREE tier available)

1. Go to **https://cloud.mongodb.com**
2. Create a free account → Create a FREE cluster (M0)
3. Database Access → Add Database User (username + password)
4. Network Access → Add IP Address → Allow from Anywhere (0.0.0.0/0)
5. Clusters → Connect → Connect your application
6. Copy the connection string:
   `mongodb+srv://username:password@cluster.mongodb.net/pravixai`
7. Paste in `backend/.env` as `MONGODB_URI`

---

## STEP 5: Run the Project

### Backend
```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev
```

**Test it:** Open http://localhost:5000 — you should see:
```json
{
  "status": "PRAVIX AI Backend Running",
  "groq": "Connected",
  "gmail": "Connected (your@gmail.com)",
  "mongodb": "Connected"
}
```

### Web
```bash
cd web
cp .env.example .env.local
# Fill in Firebase config values
npm install
npm run dev
```
Open http://localhost:3000

### Mobile
```bash
cd mobile
cp .env.example .env
# Fill in Firebase config + backend URL
npm install
npx expo start
```
Scan the QR code with **Expo Go** app on your phone.

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `GROQ_API_KEY not configured` | Add `GROQ_API_KEY=gsk_...` to backend/.env |
| `Failed to send OTP` | Check GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env |
| `Gmail App Password not working` | Make sure 2-Step Verification is ON first |
| `MongoDB connection failed` | Check your IP is whitelisted in Atlas (0.0.0.0/0) |
| `Firebase auth error` | Check Firebase project config values match your .env |
| `Model not found` | Use `llama-3.1-8b-instant` as it is always available |
| `Rate limit` | Wait 30 seconds and try again (free tier limit) |
| Expo build errors | Delete node_modules and run `npm install` fresh |
