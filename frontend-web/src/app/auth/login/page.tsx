"use client";
export const dynamic = 'force-dynamic';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth, googleProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { Mail, Phone, Eye, EyeOff, ArrowRight, ChevronDown, Loader2, User } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', label: 'IN 🇮🇳', name: 'India' },
  { code: '+1',  label: 'US 🇺🇸', name: 'United States' },
  { code: '+44', label: 'GB 🇬🇧', name: 'United Kingdom' },
  { code: '+61', label: 'AU 🇦🇺', name: 'Australia' },
  { code: '+971',label: 'AE 🇦🇪', name: 'UAE' },
  { code: '+65', label: 'SG 🇸🇬', name: 'Singapore' },
  { code: '+60', label: 'MY 🇲🇾', name: 'Malaysia' },
  { code: '+49', label: 'DE 🇩🇪', name: 'Germany' },
  { code: '+33', label: 'FR 🇫🇷', name: 'France' },
  { code: '+81', label: 'JP 🇯🇵', name: 'Japan' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'email' | 'phone'>('email');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountries, setShowCountries] = useState(false);
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<any>(null);

  const redirectToChat = () => { if (typeof window !== 'undefined') window.location.href = '/chat'; };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken(true);
      let data: any;
      try {
        const res = await api.post('/api/auth/firebase', { idToken });
        data = res.data;
      } catch (apiErr: any) {
        const msg = apiErr?.response?.data?.error || apiErr?.message || 'Could not reach backend';
        toast.error(`Login failed: ${msg}`);
        setLoading(false);
        return;
      }
      if (!data?.token || !data?.user) { toast.error('Invalid response from server'); setLoading(false); return; }
      login(data.token, data.user, data.user.name);
      toast.success(`Welcome, ${data.user.name}! 👋`);
      redirectToChat();
    } catch (e: any) {
      const msg = e?.code === 'auth/popup-closed-by-user' ? 'Popup closed. Please try again.'
        : e?.code === 'auth/network-request-failed' ? 'Network error. Check your connection.'
        : e?.message || 'Google sign-in failed';
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload  = mode === 'signup' ? { name, email, password } : { email, password };
      const { data } = await api.post(endpoint, payload);
      if (!data?.token || !data?.user) { toast.error('Invalid response from server'); return; }
      login(data.token, data.user);
      toast.success(mode === 'signup' ? 'Account created! Welcome 🎉' : 'Welcome back! 👋');
      redirectToChat();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Authentication failed');
    } finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 7) { toast.error('Enter a valid phone number'); return; }
    setLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      const fullPhone = `${countryCode}${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, recaptchaRef.current);
      sessionStorage.setItem('pravix_otp_confirm', 'pending');
      sessionStorage.setItem('pravix_phone', fullPhone);
      (window as any).__pravixOTPConfirm = confirmation;
      toast.success('OTP sent!');
      router.push('/auth/otp');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send OTP');
      recaptchaRef.current = null;
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#080808' }}>
      {/* ── Left panel — desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(220,38,38,0.06) 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Ambient */}
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-purple-700/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-lg relative">
            <Image src="/logo.jpg" alt="Pravix" fill className="object-cover" />
          </div>
          <div>
            <p className="font-black text-lg gradient-text">Pravix GPT</p>
            <p className="text-white/35 text-xs">by Pravix Code</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-black leading-tight">
              <span className="gradient-text">AI that works</span><br/>
              <span className="text-white">the way you think.</span>
            </h2>
            <p className="text-white/45 mt-4 text-sm leading-relaxed">
              Chat, generate images, write code, and build faster — all in one place. Powered by Groq&apos;s ultra-fast inference.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Groq-powered responses in milliseconds' },
              { icon: '🎨', title: 'Image Generation', desc: 'Create stunning visuals with AI' },
              { icon: '💻', title: 'Code Assistant', desc: 'Debug, explain, and write better code' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/35 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-xs relative z-10">© 2025 Pravix Code. All rights reserved.</p>
      </div>

      {/* ── Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-5 md:p-8 relative">
        {/* Mobile bg */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-700/10 rounded-full blur-[120px] pointer-events-none lg:hidden" />

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block w-16 h-16 rounded-2xl overflow-hidden border border-white/10 mb-4 relative">
              <Image src="/logo.jpg" alt="Pravix" fill className="object-cover" />
            </div>
            <h1 className="text-3xl font-black gradient-text">Pravix GPT</h1>
            <p className="text-white/35 text-sm mt-1">Advanced AI Platform</p>
          </div>

          {/* Card */}
          <div className="glass-strong rounded-2xl p-7 shadow-2xl">
            {/* Mode switcher */}
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-white/35 text-xs mt-0.5">
                  {mode === 'signup' ? 'Join Pravix GPT today' : 'Sign in to continue'}
                </p>
              </div>
              <button onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
                className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded-lg px-3 py-1.5 transition-all hover:bg-purple-500/10">
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 mb-6">
              {(['email', 'phone'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase ${
                    tab === t ? 'bg-gradient-to-r from-purple-600 to-red-600 text-white shadow-lg' : 'text-white/40 hover:text-white/70'
                  }`}>
                  {t === 'email' ? <Mail size={13}/> : <Phone size={13}/>}
                  {t}
                </button>
              ))}
            </div>

            {tab === 'email' ? (
              <form onSubmit={handleEmail} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="text-xs text-white/45 mb-1.5 block font-medium">Full Name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
                      <input className="input-field pl-9" placeholder="John Doe" value={name}
                        onChange={e => setName(e.target.value)} required />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-white/45 mb-1.5 block font-medium">Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
                    <input className="input-field pl-9" type="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/45 mb-1.5 block font-medium">Password</label>
                  <div className="relative">
                    <input className="input-field pr-11" type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••" value={password}
                      onChange={e => setPassword(e.target.value)} required minLength={8} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                      {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
                  {loading ? <Loader2 size={16} className="animate-spin-slow"/> : <><ArrowRight size={15}/>{mode === 'signup' ? 'Create Account' : 'Sign In'}</>}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/45 mb-1.5 block font-medium">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button type="button" onClick={() => setShowCountries(!showCountries)}
                        className="input-field w-28 flex items-center justify-between gap-1 cursor-pointer text-sm">
                        <span>{countryCode}</span>
                        <ChevronDown size={12} className="text-white/40 shrink-0"/>
                      </button>
                      {showCountries && (
                        <div className="absolute top-full left-0 mt-1 w-56 glass-strong rounded-xl py-1 z-50 max-h-48 overflow-y-auto shadow-2xl">
                          {COUNTRY_CODES.map(c => (
                            <button key={c.code} onClick={() => { setCountryCode(c.code); setShowCountries(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/8 flex justify-between items-center transition-colors">
                              <span>{c.label}</span>
                              <span className="text-white/40 text-xs">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input className="input-field flex-1" type="tel" placeholder="9876543210"
                      value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
                <button onClick={handleSendOTP} disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 size={16} className="animate-spin-slow"/> : <><Phone size={15}/> Send OTP</>}
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/8"/>
              <span className="text-white/25 text-xs font-medium">OR CONTINUE WITH</span>
              <div className="flex-1 h-px bg-white/8"/>
            </div>

            {/* Google */}
            <button onClick={handleGoogle} disabled={loading}
              className="btn-glass w-full hover:border-white/20 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="text-center text-white/18 text-xs mt-5">
            Pravix GPT &bull; by Pravix Code &bull; AI Platform
          </p>
        </div>
      </div>

      <div id="recaptcha-container" />
      <div className="watermark">developed by praveen</div>
    </div>
  );
}
