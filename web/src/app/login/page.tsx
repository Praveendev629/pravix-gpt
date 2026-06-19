"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Mail, Lock, User, Chrome, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import axios from "axios";

type Mode = "main" | "signin" | "signup" | "forgot";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) router.replace("/chat"); }, [user, router]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/chat");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/chat");
    } catch (e: any) {
      if (e.code === "auth/invalid-credential") toast.error("Wrong email or password.");
      else if (e.code === "auth/user-not-found") toast.error("No account found. Please sign up.");
      else toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      // 1. Create Firebase account
      await createUserWithEmailAndPassword(auth, email, password);

      // 2. Send real OTP via backend (Nodemailer + Gmail)
      const res = await axios.post(`${API_URL}/api/otp/send`, { email });
      if (res.data.success) {
        toast.success("OTP sent to your email!");
        // Store email for verify page
        localStorage.setItem("pravix-verify-email", email);
        router.push("/verify");
      }
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") toast.error("Email already registered. Please sign in.");
      else if (e.response?.data?.error) toast.error(e.response.data.error);
      else toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Check your inbox.");
      setMode("signin");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-20 h-20 rounded-2xl overflow-hidden neon-glow">
            <Image src="/logo.jpg" alt="PRAVIX AI" width={80} height={80} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
            PRAVIX AI
          </h1>
          <p className="text-gray-400 text-sm">Advanced AI Assistant</p>
        </div>

        <div className="glass rounded-2xl p-6 gradient-border">
          <AnimatePresence mode="wait">

            {/* Main mode */}
            {mode === "main" && (
              <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3">
                <button onClick={handleGoogle} disabled={loading}
                  className="flex items-center justify-center gap-3 w-full py-3 rounded-xl gradient-border text-white font-medium hover:bg-white/5 transition-all disabled:opacity-50">
                  <Chrome size={20} className="text-[var(--primary)]" />
                  Continue with Google
                </button>
                <div className="relative flex items-center my-1">
                  <div className="flex-1 border-t border-white/10" />
                  <span className="px-3 text-gray-500 text-sm">or</span>
                  <div className="flex-1 border-t border-white/10" />
                </div>
                <button onClick={() => setMode("signin")}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all">
                  Sign In <ArrowRight size={16} />
                </button>
                <button onClick={() => setMode("signup")}
                  className="w-full py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all">
                  Create Account
                </button>
              </motion.div>
            )}

            {/* Sign In */}
            {mode === "signin" && (
              <motion.form key="signin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSignIn} className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-white">Sign In</h2>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors text-sm" />
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type={showPass ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors text-sm" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign In"}
                </button>
                <div className="flex justify-between text-sm text-gray-500">
                  <button type="button" onClick={() => setMode("main")} className="hover:text-[var(--primary)] transition-colors">Back</button>
                  <button type="button" onClick={() => setMode("forgot")} className="hover:text-[var(--primary)] transition-colors">Forgot Password?</button>
                  <button type="button" onClick={() => setMode("signup")} className="hover:text-[var(--primary)] transition-colors">Sign Up</button>
                </div>
              </motion.form>
            )}

            {/* Sign Up */}
            {mode === "signup" && (
              <motion.form key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSignUp} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Create Account</h2>
                  <p className="text-xs text-gray-500 mt-1">A 6-digit OTP will be sent to your email</p>
                </div>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors text-sm" />
                </div>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors text-sm" />
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type={showPass ? "text" : "password"} placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors text-sm" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Sending OTP...</> : "Send OTP & Register"}
                </button>
                <div className="flex justify-between text-sm text-gray-500">
                  <button type="button" onClick={() => setMode("main")} className="hover:text-[var(--primary)] transition-colors">Back</button>
                  <button type="button" onClick={() => setMode("signin")} className="hover:text-[var(--primary)] transition-colors">Sign In</button>
                </div>
              </motion.form>
            )}

            {/* Forgot Password */}
            {mode === "forgot" && (
              <motion.form key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleForgot} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Reset Password</h2>
                  <p className="text-xs text-gray-500 mt-1">A reset link will be sent to your email</p>
                </div>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors text-sm" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Send Reset Email"}
                </button>
                <button type="button" onClick={() => setMode("signin")} className="text-sm text-gray-500 hover:text-[var(--primary)] transition-colors">
                  Back to Sign In
                </button>
              </motion.form>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">Developed By Praveen</p>
      </motion.div>
    </div>
  );
}
