"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Mail, Lock, User, Chrome, Eye, EyeOff, ArrowRight, RefreshCw } from "lucide-react";

type Mode = "main" | "signin" | "signup" | "forgot";

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
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        toast.error("Please verify your email first.");
        router.push("/verify");
        return;
      }
      router.replace("/chat");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      toast.success("Verification email sent!");
      router.push("/verify");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset email sent!");
      setMode("signin");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden neon-glow mb-4">
            <Image src="/logo.jpg" alt="PRAVIX AI" width={80} height={80} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
            PRAVIX AI
          </h1>
          <p className="text-gray-400 text-sm mt-1">Advanced AI Assistant</p>
        </div>

        <div className="glass rounded-2xl p-6 gradient-border">
          <AnimatePresence mode="wait">
            {mode === "main" && (
              <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                <button onClick={handleGoogle} disabled={loading}
                  className="flex items-center justify-center gap-3 w-full py-3 rounded-xl gradient-border text-white font-medium hover:bg-white/5 transition-all">
                  <Chrome size={20} className="text-[var(--primary)]" />
                  Continue with Google
                </button>
                <div className="relative flex items-center my-2">
                  <div className="flex-1 border-t border-white/10" />
                  <span className="px-3 text-gray-500 text-sm">or</span>
                  <div className="flex-1 border-t border-white/10" />
                </div>
                <button onClick={() => setMode("signin")}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-all">
                  Sign In <ArrowRight size={16} />
                </button>
                <button onClick={() => setMode("signup")}
                  className="w-full py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all">
                  Sign Up
                </button>
              </motion.div>
            )}

            {(mode === "signin" || mode === "signup" || mode === "forgot") && (
              <motion.form key={mode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={mode === "signin" ? handleSignIn : mode === "signup" ? handleSignUp : handleForgot}
                className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-white mb-2">
                  {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password"}
                </h2>

                {mode === "signup" && (
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors" />
                  </div>
                )}

                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors" />
                </div>

                {mode !== "forgot" && (
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPass ? "text" : "password"} placeholder="Password" value={password}
                      onChange={e => setPassword(e.target.value)} required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
                  {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
                </button>

                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <button type="button" onClick={() => setMode("main")} className="hover:text-[var(--primary)]">Back</button>
                  {mode === "signin" && (
                    <button type="button" onClick={() => setMode("forgot")} className="hover:text-[var(--primary)]">Forgot Password?</button>
                  )}
                  {mode === "signin" && (
                    <button type="button" onClick={() => setMode("signup")} className="hover:text-[var(--primary)]">Sign Up</button>
                  )}
                  {mode === "signup" && (
                    <button type="button" onClick={() => setMode("signin")} className="hover:text-[var(--primary)]">Sign In</button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">Developed By Praveen</p>
      </motion.div>
    </div>
  );
}
