"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import {
  Send, Plus, MessageSquare, Trash2, Pin, PenLine, Search,
  Copy, LogOut, Settings, Zap, Menu, X, Image as ImageIcon,
  Download, RefreshCw, Loader2, Check, Code2, ChevronRight,
  Sparkles, Bot
} from 'lucide-react';

// ── Types
interface Message {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  imagePrompt?: string;
}
interface Chat {
  _id: string; title: string; lastMessage: string;
  lastMessageAt: string; isPinned: boolean; messageCount: number;
}

// ── Cloudinary upload (unsigned)
async function uploadToCloudinary(imageUrl: string, prompt: string): Promise<string | null> {
  const cloudName   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) return null;
  try {
    const fd = new FormData();
    fd.append('file', imageUrl);
    fd.append('upload_preset', uploadPreset);
    fd.append('folder', 'pravix-gpt/ai-generated');
    fd.append('context', `prompt=${prompt.slice(0, 200)}`);
    const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    return data.secure_url || null;
  } catch { return null; }
}

// ── Download helper
async function downloadImage(url: string, filename: string) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch { toast.error('Download failed'); }
}

// ── Logo component
const PravixLogo = ({ size = 32 }: { size?: number }) => (
  <div className="relative rounded-xl overflow-hidden border border-white/10"
    style={{ width: size, height: size, minWidth: size }}>
    <Image src="/logo.jpg" alt="Pravix" fill className="object-cover" />
  </div>
);

// ── Code block component
const CodeBlock = ({ lang, children }: { lang: string; children: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="code-block-wrapper my-3">
      <div className="code-block-header">
        <span className="text-xs text-purple-400 font-semibold">{lang || 'code'}</span>
        <button onClick={copy} className="btn-icon w-7 h-7 rounded-md">
          {copied ? <Check size={11} className="text-green-400"/> : <Copy size={11}/>}
        </button>
      </div>
      <div className="code-block-body">
        <pre><code>{children}</code></pre>
      </div>
    </div>
  );
};

// ── Image message card
const ImageCard = ({ msg }: { msg: Message }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleDownload = () => downloadImage(msg.imageUrl!, `pravix-ai-${Date.now()}.png`);
  const handleSave = async () => {
    if (!msg.imageUrl) return;
    setSaving(true);
    const url = await uploadToCloudinary(msg.imageUrl, msg.imagePrompt || '');
    setSaving(false);
    if (url) { setSaved(true); toast.success('Saved to Cloudinary!'); }
    else toast.error('Cloudinary not configured — check NEXT_PUBLIC_CLOUDINARY_* env vars');
  };

  return (
    <div className="image-gen-card animate-image-reveal">
      <div className="relative overflow-hidden" style={{ aspectRatio: '1/1', background: '#111' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={msg.imageUrl} alt={msg.imagePrompt} className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="%23111" width="400" height="400"/><text fill="%23555" font-size="16" x="50%" y="50%" text-anchor="middle">Image unavailable</text></svg>'; }}/>
      </div>
      {msg.imagePrompt && (
        <div className="px-3 py-2 border-t border-white/6">
          <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{msg.imagePrompt}</p>
        </div>
      )}
      <div className="image-actions">
        <button onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-white/60 hover:text-white py-1.5 rounded-lg hover:bg-white/8 transition-all">
          <Download size={13}/> Download
        </button>
        <div className="w-px bg-white/8"/>
        <button onClick={handleSave} disabled={saving || saved}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-all disabled:opacity-60"
          style={{ color: saved ? '#22c55e' : 'rgba(167,139,250,0.8)' }}>
          {saving ? <Loader2 size={12} className="animate-spin-slow"/> : saved ? <Check size={12}/> : <ImageIcon size={12}/>}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save to Cloud'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// ── Main Chat Page
// ─────────────────────────────────────────
export default function ChatPage() {
  const { user, chatUsername, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [chats, setChats]         = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId]   = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [mode, setMode]           = useState<'chat' | 'image'>('chat');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId]   = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const inputAreaRef   = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!authLoading && !user) router.replace('/auth/login'); }, [user, authLoading, router]);
  useEffect(() => { if (user) loadChats(); }, [user]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamContent]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  const loadChats = async () => {
    try { const { data } = await api.get('/api/chat'); setChats(data); } catch { }
  };

  const loadMessages = async (chatId: string) => {
    try { const { data } = await api.get(`/api/chat/${chatId}/messages`); setMessages(data); } catch { }
  };

  const createChat = async (title = 'New Conversation') => {
    try {
      const { data } = await api.post('/api/chat', { title });
      setChats(prev => [data, ...prev]);
      setActiveChat(data._id);
      setMessages([]);
      setSidebarOpen(false);
      return data._id as string;
    } catch { toast.error('Failed to create conversation'); return null; }
  };

  const selectChat = async (chatId: string) => {
    setActiveChat(chatId);
    setSidebarOpen(false);
    await loadMessages(chatId);
  };

  // ── Send text message
  const sendMessage = async () => {
    if (!input.trim() || streaming || generating) return;
    let chatId = activeChat;
    if (!chatId) {
      chatId = await createChat(input.slice(0, 60));
      if (!chatId) return;
    }
    const userMsg: Message = { _id: Date.now().toString(), role: 'user', content: input, createdAt: new Date().toISOString(), type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    const sentInput = input;
    setInput('');
    setStreaming(true);
    setStreamContent('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/${chatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('pravix_token')}` },
        body: JSON.stringify({ content: sentInput, chatUsername }),
      });
      const reader  = response.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.delta) { full += parsed.delta; setStreamContent(full); }
              if (parsed.done) {
                setMessages(prev => [...prev, { _id: parsed.messageId, role: 'assistant', content: full, createdAt: new Date().toISOString(), type: 'text' }]);
                setStreamContent('');
                loadChats();
              }
            } catch { }
          }
        }
      }
    } catch { toast.error('Failed to send message'); } finally { setStreaming(false); }
  };

  // ── Generate image
  const generateImage = async () => {
    if (!input.trim() || generating || streaming) return;
    let chatId = activeChat;
    if (!chatId) {
      chatId = await createChat(`Image: ${input.slice(0, 50)}`);
      if (!chatId) return;
    }
    const prompt = input.trim();
    const userMsg: Message = { _id: Date.now().toString(), role: 'user', content: `🎨 Generate image: ${prompt}`, createdAt: new Date().toISOString(), type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setGenerating(true);

    // Placeholder while generating
    const placeholderId = `img-${Date.now()}`;
    setMessages(prev => [...prev, { _id: placeholderId, role: 'assistant', content: '', type: 'image', imageUrl: '', imagePrompt: prompt, createdAt: new Date().toISOString() }]);

    try {
      const { data } = await api.post('/api/image/generate', { prompt, enhance: true });
      const imageUrl = data.imageUrl;
      if (!imageUrl) throw new Error('No image URL returned');

      // Replace placeholder with real image
      setMessages(prev => prev.map(m => m._id === placeholderId
        ? { ...m, imageUrl, imagePrompt: data.enhancedPrompt || prompt }
        : m
      ));
      loadChats();
    } catch (e: any) {
      setMessages(prev => prev.filter(m => m._id !== placeholderId));
      toast.error(e?.response?.data?.error || 'Image generation failed');
    } finally { setGenerating(false); }
  };

  const handleSubmit = () => { mode === 'image' ? generateImage() : sendMessage(); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/chat/${id}`);
      setChats(prev => prev.filter(c => c._id !== id));
      if (activeChat === id) { setActiveChat(null); setMessages([]); }
    } catch { }
  };

  const pinChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await api.patch(`/api/chat/${id}/pin`);
      setChats(prev => prev.map(c => c._id === id ? { ...c, isPinned: data.isPinned } : c));
    } catch { }
  };

  const saveRename = async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      await api.patch(`/api/chat/${id}`, { title: renameValue });
      setChats(prev => prev.map(c => c._id === id ? { ...c, title: renameValue } : c));
      setRenamingId(null);
    } catch { }
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const pinnedChats   = filteredChats.filter(c => c.isPinned);
  const regularChats  = filteredChats.filter(c => !c.isPinned);

  const userInitial = (chatUsername || user?.name || 'U')[0].toUpperCase();

  if (authLoading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <PravixLogo size={48}/>
        <div className="flex gap-1.5"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div>
      </div>
    </div>
  );

  // ── Sidebar content (shared between mobile overlay and desktop)
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <PravixLogo size={34}/>
          <div>
            <p className="font-bold text-sm gradient-text">Pravix GPT</p>
            <p className="text-white/30 text-[10px]">by Pravix Code</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden btn-icon">
          <X size={15}/>
        </button>
      </div>

      {/* New chat */}
      <div className="p-3 shrink-0">
        <button onClick={() => createChat()} className="btn-primary w-full text-sm py-2.5">
          <Plus size={15}/> New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
          <input className="input-field pl-8 py-2 text-xs" placeholder="Search conversations..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {pinnedChats.length > 0 && (
          <p className="text-white/25 text-[10px] px-2 py-2 font-semibold tracking-widest uppercase">📌 Pinned</p>
        )}
        {[...pinnedChats, ...regularChats].map((chat, i) => (
          <div key={chat._id}>
            {i === pinnedChats.length && regularChats.length > 0 && pinnedChats.length > 0 && (
              <p className="text-white/25 text-[10px] px-2 py-2 font-semibold tracking-widest uppercase mt-2">Recent</p>
            )}
            <div onClick={() => selectChat(chat._id)}
              className={`chat-item group ${activeChat === chat._id ? 'active' : ''}`}>
              <MessageSquare size={13} className={activeChat === chat._id ? 'text-purple-400' : 'text-white/25'}/>
              <div className="flex-1 min-w-0">
                {renamingId === chat._id ? (
                  <input className="input-field text-xs py-0.5 px-2 w-full" value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveRename(chat._id); if (e.key === 'Escape') setRenamingId(null); }}
                    onClick={e => e.stopPropagation()} autoFocus/>
                ) : (
                  <p className="text-xs font-medium text-white/80 truncate">{chat.title}</p>
                )}
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={e => { e.stopPropagation(); setRenamingId(chat._id); setRenameValue(chat.title); }}
                  className="btn-icon w-6 h-6 rounded-md"><PenLine size={10}/></button>
                <button onClick={e => pinChat(chat._id, e)}
                  className={`btn-icon w-6 h-6 rounded-md ${chat.isPinned ? 'text-yellow-400' : ''}`}><Pin size={10}/></button>
                <button onClick={e => deleteChat(chat._id, e)}
                  className="btn-icon w-6 h-6 rounded-md hover:text-red-400"><Trash2 size={10}/></button>
              </div>
            </div>
          </div>
        ))}
        {filteredChats.length === 0 && (
          <div className="text-center py-12 text-white/25 text-xs">No conversations yet</div>
        )}
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-white/6 shrink-0">
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{chatUsername || user?.name}</p>
            <p className="text-[10px] text-white/35 truncate">{user?.email || 'Pravix GPT User'}</p>
          </div>
          <button onClick={() => { logout(); router.push('/auth/login'); }}
            className="btn-icon w-7 h-7 rounded-md hover:text-red-400">
            <LogOut size={12}/>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#080808] overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay md:hidden" onClick={() => setSidebarOpen(false)}/>
      )}

      {/* ── Sidebar */}
      <aside className={`
        sidebar-transition sidebar-bg
        fixed inset-y-0 left-0 z-30 w-72
        md:relative md:translate-x-0 md:z-auto md:flex md:shrink-0
        flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent/>
      </aside>

      {/* ── Main area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="glass border-b border-white/6 px-4 py-3 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="btn-icon md:hidden">
              <Menu size={16}/>
            </button>
            {/* Active chat title on mobile */}
            <div className="md:hidden">
              <p className="text-sm font-bold gradient-text">Pravix GPT</p>
            </div>
            {/* Desktop: breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-sm text-white/40">
              <Bot size={15} className="text-purple-400"/>
              <span className="text-white/60 font-medium">
                {activeChat ? chats.find(c => c._id === activeChat)?.title || 'Chat' : 'New Chat'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="mode-pill hidden sm:flex">
              <button onClick={() => setMode('chat')} className={`mode-pill-btn ${mode === 'chat' ? 'active' : ''}`}>
                <Sparkles size={11}/> Chat
              </button>
              <button onClick={() => setMode('image')} className={`mode-pill-btn ${mode === 'image' ? 'active' : ''}`}>
                <ImageIcon size={11}/> Image
              </button>
            </div>

            <button onClick={() => router.push('/workspace')} className="btn-glass px-3 py-1.5 text-xs hidden sm:flex">
              <Code2 size={12}/> Workspace
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center text-xs font-bold text-white">
                {userInitial}
              </div>
              <span className="text-white/50 text-sm hidden md:block">{chatUsername || user?.name}</span>
            </div>
            <button onClick={() => { logout(); router.push('/auth/login'); }}
              className="btn-icon hover:text-red-400">
              <LogOut size={14}/>
            </button>
          </div>
        </header>

        {/* ── Messages */}
        <div className="flex-1 overflow-y-auto" id="messages-container">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

            {/* Empty state */}
            {messages.length === 0 && !streaming && !generating && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl blur-2xl opacity-30 scale-110"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EF4444)' }}/>
                  <div className="relative w-20 h-20 rounded-3xl overflow-hidden border border-white/10">
                    <Image src="/logo.jpg" alt="Pravix" fill className="object-cover"/>
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-black gradient-text">How can I help?</h2>
                  <p className="text-white/35 mt-2 text-sm">Ask me anything or generate images with AI</p>
                </div>

                {/* Mobile mode toggle */}
                <div className="mode-pill sm:hidden">
                  <button onClick={() => setMode('chat')} className={`mode-pill-btn ${mode === 'chat' ? 'active' : ''}`}>
                    <Sparkles size={11}/> Chat
                  </button>
                  <button onClick={() => setMode('image')} className={`mode-pill-btn ${mode === 'image' ? 'active' : ''}`}>
                    <ImageIcon size={11}/> Image
                  </button>
                </div>

                {/* Suggestion chips */}
                {mode === 'chat' ? (
                  <div className="grid grid-cols-2 gap-2.5 max-w-sm w-full">
                    {['Write a React component', 'Explain quantum computing', 'Debug my Python code', 'Create a business plan'].map(s => (
                      <button key={s} onClick={() => setInput(s)}
                        className="glass-card text-xs py-3 px-3 text-left text-white/60 hover:text-white transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 max-w-sm w-full">
                    {['A futuristic city at night', 'Portrait of a cyberpunk warrior', 'Magical forest with glowing trees', 'Abstract art with vibrant colors'].map(s => (
                      <button key={s} onClick={() => setInput(s)}
                        className="glass-card text-xs py-3 px-3 text-left text-white/60 hover:text-white transition-colors">
                        <ImageIcon size={11} className="text-purple-400 mb-1"/>
                        <br/>{s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div key={msg._id}
                className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {/* Assistant avatar */}
                {msg.role === 'assistant' && (
                  <div className="shrink-0 mt-1">
                    <PravixLogo size={30}/>
                  </div>
                )}

                <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  style={{ maxWidth: msg.type === 'image' ? '480px' : 'min(85%, 700px)' }}>

                  {/* Image message */}
                  {msg.type === 'image' && msg.role === 'assistant' ? (
                    msg.imageUrl ? (
                      <ImageCard msg={msg}/>
                    ) : (
                      // Generating placeholder
                      <div className="image-gen-card">
                        <div className="flex flex-col items-center justify-center gap-3 p-10"
                          style={{ aspectRatio: '1/1', background: 'rgba(124,58,237,0.06)' }}>
                          <div className="w-10 h-10 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin-slow"/>
                          <p className="text-white/40 text-xs">Generating image...</p>
                          <p className="text-white/25 text-[10px] max-w-[200px] text-center line-clamp-2">
                            {msg.imagePrompt}
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Text message */
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-purple-600/80 to-red-600/60 border border-purple-500/20'
                        : 'glass'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}
                            components={{
                              code({ className, children, ...props }: any) {
                                const lang = /language-(\w+)/.exec(className || '')?.[1] || '';
                                const isBlock = className?.includes('language-');
                                return isBlock
                                  ? <CodeBlock lang={lang}>{String(children).replace(/\n$/, '')}</CodeBlock>
                                  : <code className={className} {...props}>{children}</code>;
                              }
                            }}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  )}

                  {/* Actions row */}
                  {msg.role === 'assistant' && msg.type !== 'image' && (
                    <div className="flex gap-1 pl-1">
                      <button onClick={() => copyMessage(msg.content, msg._id)}
                        className="btn-icon w-7 h-7 rounded-md">
                        {copiedId === msg._id ? <Check size={11} className="text-green-400"/> : <Copy size={11}/>}
                      </button>
                    </div>
                  )}
                </div>

                {/* User avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1">
                    {userInitial}
                  </div>
                )}
              </div>
            ))}

            {/* Streaming text */}
            {streaming && (
              <div className="flex gap-3 justify-start animate-fade-in">
                <div className="shrink-0 mt-1"><PravixLogo size={30}/></div>
                <div className="glass rounded-2xl px-4 py-3 max-w-[min(85%,700px)]">
                  {streamContent ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 items-center py-1">
                      <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef}/>
          </div>
        </div>

        {/* ── Input area */}
        <div ref={inputAreaRef} className="glass border-t border-white/6 p-3 md:p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Mobile mode toggle */}
            <div className="flex sm:hidden justify-center mb-2">
              <div className="mode-pill">
                <button onClick={() => setMode('chat')} className={`mode-pill-btn ${mode === 'chat' ? 'active' : ''}`}>
                  <Sparkles size={10}/> Chat
                </button>
                <button onClick={() => setMode('image')} className={`mode-pill-btn ${mode === 'image' ? 'active' : ''}`}>
                  <ImageIcon size={10}/> Image
                </button>
              </div>
            </div>

            {/* Input box */}
            <div className={`flex gap-2 md:gap-3 items-end rounded-2xl border p-2 transition-all ${
              mode === 'image'
                ? 'bg-purple-950/20 border-purple-500/25 focus-within:border-purple-500/50 focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.1)]'
                : 'glass border-white/10 focus-within:border-purple-500/40 focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.08)]'
            }`}>

              {/* Mode indicator icon */}
              <div className="shrink-0 pb-1.5 pl-1 text-white/25">
                {mode === 'image' ? <ImageIcon size={17} className="text-purple-400"/> : <Sparkles size={17}/>}
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mode === 'image'
                  ? 'Describe the image you want to generate...'
                  : 'Ask Pravix AI anything… (Shift+Enter for new line)'}
                className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder-white/25 py-1.5 leading-relaxed"
                rows={1}
                style={{ minHeight: '36px', maxHeight: '180px' }}
                disabled={streaming || generating}
              />

              <button
                onClick={handleSubmit}
                disabled={!input.trim() || streaming || generating}
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #DC2626)' }}>
                {streaming || generating
                  ? <Loader2 size={15} className="animate-spin-slow text-white"/>
                  : mode === 'image'
                  ? <ImageIcon size={15} className="text-white"/>
                  : <Send size={15} className="text-white"/>}
              </button>
            </div>

            <p className="text-center text-white/15 text-[10px] mt-2">
              {mode === 'image'
                ? 'Images generated by AI • Click "Save to Cloud" to store in Cloudinary'
                : 'Pravix AI can make mistakes. Verify important information.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
