"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { CheckCircle, Mail, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import Image from "next/image";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function VerifyPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [wrongOtp, setWrongOtp] = useState(false);
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("pravix-verify-email");
    if (!stored) { router.replace("/login"); return; }
    setEmail(stored);
    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const handleChange = (i: number, v: string) => {
    if (!/^[0-9]?$/.test(v)) return;
    setWrongOtp(false);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
    // Auto-submit when all 6 digits entered
    if (v && i === 5 && next.every(d => d !== "")) {
      handleVerify(next.join(""));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split("");
      setOtp(next);
      inputs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (otpStr?: string) => {
    const code = otpStr || otp.join("");
    if (code.length !== 6) { toast.error("Enter all 6 digits"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/otp/verify`, { email, otp: code });
      if (res.data.success) {
        setVerified(true);
        // Animate all boxes to green then redirect
        setTimeout(() => {
          localStorage.removeItem("pravix-verify-email");
          router.replace("/chat");
        }, 2200);
      }
    } catch (e: any) {
      setWrongOtp(true);
      const msg = e.response?.data?.error || "Verification failed";
      toast.error(msg);
      // Shake effect - reset boxes
      setTimeout(() => { setOtp(["", "", "", "", "", ""]); inputs.current[0]?.focus(); }, 600);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      const res = await axios.post(`${API_URL}/api/otp/send`, { email });
      if (res.data.success) {
        toast.success("New OTP sent to your email!");
        setOtp(["", "", "", "", "", ""]);
        setCountdown(60);
        inputs.current[0]?.focus();
        const timer = setInterval(() => {
          setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
        }, 1000);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to resend OTP");
    } finally { setResending(false); }
  };

  const getBoxColor = (i: number) => {
    if (verified) return "border-green-500 bg-green-500/10 text-green-400";
    if (wrongOtp && otp[i]) return "border-red-500 bg-red-500/10 text-red-400";
    if (otp[i]) return "border-[var(--primary)] bg-[var(--primary)]/10 text-white";
    return "border-white/15 bg-white/5 text-white";
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden neon-glow">
            <Image src="/logo.jpg" alt="PRAVIX AI" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
            PRAVIX AI
          </h1>
        </div>

        <div className="glass rounded-2xl p-6 gradient-border">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.back()} className="p-1 text-gray-500 hover:text-white transition-colors">
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-xl font-bold text-white">Verify Email</h2>
          </div>
          <div className="flex items-center gap-2 mb-6 ml-6">
            <Mail size={14} className="text-gray-500" />
            <span className="text-sm text-gray-400">{email}</span>
          </div>

          <p className="text-sm text-gray-400 mb-4 text-center">
            Enter the 6-digit code sent to your email
          </p>

          {/* OTP Boxes */}
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((val, i) => (
              <motion.input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={val}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                animate={
                  verified
                    ? { scale: [1, 1.2, 1], transition: { delay: i * 0.07 } }
                    : wrongOtp
                    ? { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.4 } }
                    : {}
                }
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:scale-105 ${getBoxColor(i)}`}
                style={{ height: "56px" }}
              />
            ))}
          </div>

          {/* Verified Success */}
          <AnimatePresence>
            {verified && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 mb-4">
                <CheckCircle size={44} className="text-green-400" />
                <p className="text-green-400 font-semibold text-lg">Email Verified!</p>
                <p className="text-gray-400 text-sm">Redirecting to chat...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Verify Button */}
          {!verified && (
            <button onClick={() => handleVerify()} disabled={loading || otp.some(v => !v)}
              className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 mb-4">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : "Verify OTP"}
            </button>
          )}

          {/* Resend */}
          {!verified && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Did not receive it?</span>
              <button onClick={handleResend} disabled={countdown > 0 || resending}
                className="flex items-center gap-1 text-[var(--primary)] hover:underline disabled:opacity-40 disabled:no-underline transition-all">
                {resending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">Developed By Praveen</p>
      </motion.div>
    </div>
  );
}
