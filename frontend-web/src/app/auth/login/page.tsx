"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth, googleProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Mail, Phone, Eye, EyeOff, ArrowRight, ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', label: 'IN', name: 'India' },
  { code: '+1', label: 'US', name: 'United States' },
  { code: '+44', label: 'GB', name: 'United Kingdom' },
  { code: '+61', label: 'AU', name: 'Australia' },
  { code: '+971', label: 'AE', name: 'UAE' },
  { code: '+65', label: 'SG', name: 'Singapore' },
  { code: '+60', label: 'MY', name: 'Malaysia' },
  { code: '+49', label: 'DE', name: 'Germany' },
  { code: '+33', label: 'FR', name: 'France' },
  { code: '+81', label: 'JP', name: 'Japan' },
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

  // Google Sign In
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const { data } = await api.post('/api/auth/firebase', { idToken });
      login(data.token, data.user, data.user.name);
      toast.success(`Welcome, ${data.user.name}!`);
      router.push('/chat');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Google sign-in failed');
    } finally { setLoading(false); }
  };

  // Email auth
  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = mode === 'signup' ? { name, email, password } : { email, password };
      const { data } = await api.post(endpoint, payload);
      login(data.token, data.user);
      toast.success(`Welcome${mode === 'signup' ? ' to Pravix GPT' : ' back'}!`);
      router.push('/chat');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Authentication failed');
    } finally { setLoading(false); }
  };

  // Phone OTP
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
      // Store confirmation result via window (temporary)
      (window as any).__pravixOTPConfirm = confirmation;
      toast.success('OTP sent successfully');
      router.push('/auth/otp');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send OTP');
      recaptchaRef.current = null;
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EF4444)' }}>
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <path d="M8 36L24 8L40 36H8Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
              <circle cx="24" cy="26" r="4" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black gradient-text">Pravix GPT</h1>
          <p className="text-white/40 text-sm mt-1">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          {/* Tab: Email / Phone */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            <button onClick={() => setTab('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'email' ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`}>
              <Mail size={15}/> Email
            </button>
            <button onClick={() => setTab('phone')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'phone' ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`}>
              <Phone size={15}/> Phone
            </button>
          </div>

          {tab === 'email' ? (
            <form onSubmit={handleEmail} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Full Name</label>
                  <input className="input-field" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Email Address</label>
                <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Password</label>
                <div className="relative">
                  <input className="input-field pr-11" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? <span className="flex gap-1"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span>
                  : <><ArrowRight size={16}/>{mode === 'signup' ? 'Create Account' : 'Sign In'}</>}
              </button>

              <p className="text-center text-white/40 text-sm">
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <button type="button" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="text-purple-400 hover:text-purple-300 font-medium">
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Phone Number</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button type="button" onClick={() => setShowCountries(!showCountries)}
                      className="input-field w-24 flex items-center gap-1 cursor-pointer">
                      <span className="text-sm font-medium">{countryCode}</span>
                      <ChevronDown size={12} className="text-white/40"/>
                    </button>
                    {showCountries && (
                      <div className="absolute top-full left-0 mt-1 w-52 glass rounded-xl py-1 z-50 max-h-48 overflow-y-auto">
                        {COUNTRY_CODES.map(c => (
                          <button key={c.code} onClick={() => { setCountryCode(c.code); setShowCountries(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex gap-2">
                            <span className="font-bold text-purple-400">{c.label}</span>
                            <span className="text-white/60">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input className="input-field flex-1" type="tel" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>

              <button onClick={handleSendOTP} disabled={loading} className="btn-primary w-full">
                {loading ? <span className="flex gap-1"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span>
                  : <><Phone size={16}/> Send OTP</>}
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10"/>
            <span className="text-white/30 text-xs">OR</span>
            <div className="flex-1 h-px bg-white/10"/>
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading} className="btn-glass w-full">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">Pravix GPT &bull; AI Platform</p>
      </div>

      <div id="recaptcha-container" />
      <div className="watermark">developed by praveen</div>
    </div>
  );
}
