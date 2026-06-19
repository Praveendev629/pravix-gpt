"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";
import { sendEmailVerification, reload } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { CheckCircle, Mail, RefreshCw } from "lucide-react";
import Image from "next/image";

export default function VerifyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (user?.emailVerified) { router.replace("/chat"); }
  }, [user, router]);

  const handleChange = (i: number, v: string) => {
    if (!/^[0-9]?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const checkVerification = async () => {
    setChecking(true);
    try {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          setVerified(true);
          setTimeout(() => router.replace("/chat"), 2000);
        } else {
          toast.error("Email not verified yet. Please check your inbox.");
        }
      }
    } finally { setChecking(false); }
  };

  const resend = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email resent!");
    }
  };

  const allFilled = otp.every(v => v !== "");

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl overflow-hidden neon-glow mb-4">
            <Image src="/logo.jpg" alt="PRAVIX AI" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verify Email</h1>
          <p className="text-gray-400 text-sm mt-1 text-center">
            Enter the 6-digit OTP sent to your email
          </p>
        </div>

        <div className="glass rounded-2xl p-6 gradient-border">
          <div className="flex items-center gap-2 mb-6 text-gray-400">
            <Mail size={16} />
            <span className="text-sm">{user?.email}</span>
          </div>

          {/* OTP Boxes */}
          <div className="flex gap-3 justify-center mb-6">
            {otp.map((val, i) => (
              <motion.input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                maxLength={1}
                value={val}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                animate={verified ? { borderColor: "#10B981", backgroundColor: "rgba(16,185,129,0.1)" } : {}}
                className="w-12 h-12 text-center text-xl font-bold bg-white/5 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:border-[var(--primary)] transition-all"
              />
            ))}
          </div>

          <AnimatePresence>
            {verified && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 mb-4 text-green-400">
                <CheckCircle size={40} />
                <p className="font-semibold">Email Verified! Redirecting...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={checkVerification} disabled={checking || verified}
            className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {checking ? <RefreshCw size={16} className="animate-spin" /> : null}
            Verify Email
          </button>

          <div className="flex justify-between mt-4 text-sm">
            <span className="text-gray-400">Did not receive?</span>
            <button onClick={resend} className="text-[var(--primary)] hover:underline">Resend OTP</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
