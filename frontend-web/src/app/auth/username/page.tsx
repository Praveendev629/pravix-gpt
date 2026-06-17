"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { UserCircle2, ArrowRight, Info } from 'lucide-react';

export default function UsernamePage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || username.trim().length < 2) { toast.error('Username must be at least 2 characters'); return; }
    setLoading(true);
    try {
      const idToken = sessionStorage.getItem('pravix_firebase_token');
      if (!idToken) { router.replace('/auth/login'); return; }

      // chatUsername is session-only and NOT stored in DB
      const { data } = await api.post('/api/auth/firebase', {
        idToken,
        chatUsername: username.trim(),
      });

      login(data.token, data.user, username.trim());
      sessionStorage.removeItem('pravix_firebase_token');
      toast.success(`Welcome, ${username}!`);
      router.push('/chat');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-700/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EF4444)' }}>
            <UserCircle2 size={32} color="white"/>
          </div>
          <h1 className="text-2xl font-bold text-white">Set Your Name</h1>
          <p className="text-white/40 text-sm mt-1">Choose a display name for chatting</p>
        </div>

        <div className="glass rounded-2xl p-6">
          {/* Info notice */}
          <div className="flex gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mb-5">
            <Info size={15} className="text-purple-400 shrink-0 mt-0.5"/>
            <p className="text-white/60 text-xs">This name is only used during your current chat session and is not stored permanently.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Display Name</label>
              <input
                className="input-field"
                placeholder="e.g. Alex, Dev123..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={30}
                autoFocus
                required
              />
              <p className="text-white/20 text-xs mt-1 text-right">{username.length}/30</p>
            </div>

            <button type="submit" disabled={loading || !username.trim()} className="btn-primary w-full">
              {loading ? <span className="flex gap-1"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span>
                : <><ArrowRight size={16}/> Continue to Pravix GPT</>}
            </button>
          </form>
        </div>
      </div>
      <div className="watermark">developed by praveen</div>
    </div>
  );
}
