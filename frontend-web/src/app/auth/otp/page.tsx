"use client";
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function OTPPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // sessionStorage is only available in browser — safe inside useEffect
    const confirm = sessionStorage.getItem('pravix_otp_confirm');
    const savedPhone = sessionStorage.getItem('pravix_phone');
    if (!confirm) {
      router.replace('/auth/login');
      return;
    }
    if (savedPhone) setPhone(savedPhone);
    inputRefs.current[0]?.focus();
  }, [router]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every(d => d !== '')) handleVerify(newOtp.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((d, i) => { if (i < 6) newOtp[i] = d; });
    setOtp(newOtp);
    if (pasted.length === 6) handleVerify(pasted);
    else inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6 || loading) return;
    setLoading(true);
    setError('');
    try {
      const confirmation = (window as any).__pravixOTPConfirm;
      if (!confirmation) {
        toast.error('OTP session expired. Please try again.');
        router.replace('/auth/login');
        return;
      }
      const result = await confirmation.confirm(otpCode);
      const idToken = await result.user.getIdToken();

      setVerified(true);
      toast.success('OTP Verified!');

      sessionStorage.setItem('pravix_firebase_token', idToken);
      sessionStorage.removeItem('pravix_otp_confirm');

      setTimeout(() => router.push('/auth/username'), 1200);
    } catch {
      setError('Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-purple-700/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all duration-500 ${verified ? 'bg-green-500' : 'bg-gradient-to-br from-purple-600 to-red-500'}`}>
            {verified ? <CheckCircle2 size={32} color="white" /> : <ShieldCheck size={32} color="white" />}
          </div>
          <h1 className="text-2xl font-bold text-white">{verified ? 'Verified!' : 'Enter OTP'}</h1>
          <p className="text-white/40 text-sm mt-1">
            {verified ? 'Phone number verified successfully' : `OTP sent to ${phone || 'your phone'}`}
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <div key={i} className="relative">
                <input
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  disabled={loading || verified}
                  className={`otp-input ${verified ? 'verified' : ''} ${digit && !verified ? 'active' : ''}`}
                />
                {verified && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <CheckCircle2 size={22} className="text-green-400 animate-bounce-tick" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center mb-4 bg-red-500/10 rounded-xl py-2 px-3 border border-red-500/20">
              {error}
            </div>
          )}

          {loading && !verified && (
            <div className="text-center mb-4">
              <div className="flex gap-1 justify-center">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
              <p className="text-white/40 text-xs mt-2">Verifying OTP...</p>
            </div>
          )}

          {verified && (
            <div className="text-center text-green-400 text-sm font-medium">
              Redirecting to set up your profile...
            </div>
          )}

          {!verified && !loading && (
            <>
              <button
                onClick={() => handleVerify()}
                disabled={otp.join('').length !== 6 || loading}
                className="btn-primary w-full"
              >
                <ShieldCheck size={16} /> Verify OTP
              </button>
              <button onClick={() => router.back()} className="btn-glass w-full mt-3 text-sm">
                Resend OTP
              </button>
            </>
          )}
        </div>
      </div>
      <div className="watermark">developed by praveen</div>
    </div>
  );
}