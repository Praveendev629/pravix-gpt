"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SplashPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(timer); setReady(true); return 100; }
        return p + 2;
      });
    }, 30);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (ready && !loading) {
      if (user) router.replace('/chat');
      else router.replace('/auth/login');
    }
  }, [ready, loading, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-black">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-700/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/15 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(167,139,250,1) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center w-24 h-24 rounded-3xl purple-glow"
          style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EF4444 100%)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M8 36L24 8L40 36H8Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
            <circle cx="24" cy="26" r="4" fill="white" fillOpacity="0.9"/>
            <path d="M16 32H32" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight gradient-text">Pravix GPT</h1>
          <p className="text-white/50 mt-2 text-sm tracking-widest uppercase">Advanced AI Platform</p>
        </div>

        {/* Loading bar */}
        <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7C3AED, #EF4444)' }}
          />
        </div>

        <p className="text-white/30 text-xs">{progress < 100 ? 'Initialising...' : 'Ready'}</p>
      </div>

      {/* Watermark */}
      <div className="watermark">developed by praveen</div>
    </div>
  );
}
