"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Plus, ChevronUp, MessageSquare, Trash2, Pin, PenLine, Search, Copy, RefreshCw, Code2, LogOut, Settings, Zap } from 'lucide-react';

interface Message { _id: string; role: 'user' | 'assistant'; content: string; createdAt: string; }
interface Chat { _id: string; title: string; lastMessage: string; lastMessageAt: string; isPinned: boolean; messageCount: number; }

export default function ChatPage() {
  const { user, chatUsername, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => { if (user) loadChats(); }, [user]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamContent]);

  const loadChats = async () => {
    try { const { data } = await api.get('/api/chat'); setChats(data); } catch { }
  };

  const loadMessages = async (chatId: string) => {
    try { const { data } = await api.get(`/api/chat/${chatId}/messages`); setMessages(data); } catch { }
  };

  const createChat = async () => {
    try {
      const { data } = await api.post('/api/chat', { title: 'New Conversation' });
      setChats(prev => [data, ...prev]);
      setActiveChat(data._id);
      setMessages([]);
      setShowHistory(false);
    } catch { toast.error('Failed to create conversation'); }
  };

  const selectChat = async (chatId: string) => {
    setActiveChat(chatId);
    setShowHistory(false);
    await loadMessages(chatId);
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    let chatId = activeChat;
    if (!chatId) {
      try {
        const { data } = await api.post('/api/chat', { title: input.slice(0, 60) });
        setChats(prev => [data, ...prev]);
        chatId = data._id;
        setActiveChat(data._id);
      } catch { toast.error('Failed to start conversation'); return; }
    }

    const userMsg = { _id: Date.now().toString(), role: 'user' as const, content: input, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setStreamContent('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/${chatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('pravix_token')}` },
        body: JSON.stringify({ content: input, chatUsername }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.delta) { full += parsed.delta; setStreamContent(full); }
              if (parsed.done) {
                setMessages(prev => [...prev, { _id: parsed.messageId, role: 'assistant', content: full, createdAt: new Date().toISOString() }]);
                setStreamContent('');
                loadChats();
              }
            } catch { }
          }
        }
      }
    } catch { toast.error('Failed to send message'); } finally { setStreaming(false); }
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
    if (!renameValue.trim()) return;
    try {
      await api.patch(`/api/chat/${id}`, { title: renameValue });
      setChats(prev => prev.map(c => c._id === id ? { ...c, title: renameValue } : c));
      setRenamingId(null);
    } catch { }
  };

  const copyMessage = (content: string) => { navigator.clipboard.writeText(content); toast.success('Copied!'); };

  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const pinnedChats = filteredChats.filter(c => c.isPinned);
  const regularChats = filteredChats.filter(c => !c.isPinned);

  if (authLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex gap-2"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <header className="glass border-b border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#EF4444)' }}>
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
              <path d="M8 36L24 8L40 36H8Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
              <circle cx="24" cy="26" r="4" fill="white"/>
            </svg>
          </div>
          <span className="font-bold gradient-text">Pravix GPT</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/workspace')} className="btn-glass px-3 py-1.5 text-xs gap-1.5">
            <Code2 size={13}/> Workspace
          </button>
          <button onClick={createChat} className="btn-glass px-3 py-1.5 text-xs gap-1.5">
            <Plus size={13}/> New Chat
          </button>
          <div className="flex items-center gap-2 ml-1">
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
              {(chatUsername || user?.name || 'U')[0].toUpperCase()}
            </div>
            <span className="text-white/60 text-sm hidden sm:block">{chatUsername || user?.name}</span>
          </div>
          <button onClick={() => { logout(); router.push('/auth/login'); }} className="text-white/40 hover:text-red-400 transition-colors p-1.5">
            <LogOut size={16}/>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#EF4444)' }}>
              <Zap size={28} color="white"/>
            </div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">How can I help you?</h2>
              <p className="text-white/40 mt-2">Ask me anything — code, analysis, writing, math...</p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {['Write a React component', 'Explain quantum computing', 'Debug my Python code', 'Create a REST API'].map(s => (
                <button key={s} onClick={() => setInput(s)} className="btn-glass text-sm py-3 px-4 text-left">{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg._id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1" style={{ background: 'linear-gradient(135deg,#7C3AED,#EF4444)' }}>
                <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
                  <path d="M8 36L24 8L40 36H8Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
                  <circle cx="24" cy="26" r="3" fill="white"/>
                </svg>
              </div>
            )}
            <div className={`max-w-3xl ${msg.role === 'user' ? 'order-first' : ''}`}>
              <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-purple-600/80 ml-auto' : 'glass'}`}
                style={{ maxWidth: msg.role === 'user' ? '80vw' : '100%' }}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children }) {
                          const lang = /language-(\w+)/.exec(className || '')?.[1] || '';
                          return <div className="relative group">
                            <div className="flex items-center justify-between bg-black/50 px-3 py-1.5 rounded-t-lg border-b border-white/10">
                              <span className="text-xs text-purple-400 font-medium">{lang || 'code'}</span>
                              <button onClick={() => copyMessage(String(children))} className="text-white/30 hover:text-white/70 transition-colors">
                                <Copy size={12}/>
                              </button>
                            </div>
                            <pre className="bg-black/40 rounded-b-lg p-3 overflow-x-auto text-sm">
                              <code className={className}>{children}</code>
                            </pre>
                          </div>;
                        }
                      }}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === 'assistant' && (
                <div className="flex gap-2 mt-1.5 pl-1">
                  <button onClick={() => copyMessage(msg.content)} className="text-white/20 hover:text-white/60 transition-colors p-1"><Copy size={12}/></button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streaming && streamContent && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1" style={{ background: 'linear-gradient(135deg,#7C3AED,#EF4444)' }}>
              <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
                <path d="M8 36L24 8L40 36H8Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
                <circle cx="24" cy="26" r="3" fill="white"/>
              </svg>
            </div>
            <div className="glass rounded-2xl px-4 py-3 max-w-3xl">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
        {streaming && !streamContent && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#EF4444)' }}>
              <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
                <path d="M8 36L24 8L40 36H8Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="glass rounded-2xl px-4 py-3 flex gap-1 items-center">
              <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Input area */}
      <div className="glass border-t border-white/5 p-4 shrink-0">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <div className="flex-1 glass rounded-2xl border border-white/10 p-2">
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask Pravix AI anything... (Shift+Enter for new line)"
              className="w-full bg-transparent text-white text-sm resize-none outline-none max-h-48 p-2 placeholder-white/30"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>
          <button onClick={sendMessage} disabled={!input.trim() || streaming} className="btn-primary w-11 h-11 p-0 rounded-xl shrink-0">
            <Send size={16}/>
          </button>
        </div>
        <p className="text-center text-white/15 text-xs mt-2">Pravix AI can make mistakes. Verify important information.</p>
      </div>

      {/* Chat History Drawer */}
      <button onClick={() => setShowHistory(!showHistory)}
        className={`fixed bottom-24 right-5 w-11 h-11 rounded-full flex items-center justify-center transition-all z-40 ${showHistory ? 'bg-purple-600' : 'glass border border-white/10'}`}>
        <ChevronUp size={18} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}/>
      </button>

      {showHistory && (
        <div className="fixed inset-0 z-30" onClick={() => setShowHistory(false)}>
          <div className="absolute bottom-0 left-0 right-0 glass border-t border-white/10 rounded-t-2xl max-h-[70vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white">Chat History</h3>
              <button onClick={createChat} className="btn-primary px-3 py-1.5 text-xs"><Plus size={12}/> New</button>
            </div>
            <div className="p-3 border-b border-white/5">
              <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/><input className="input-field pl-9 py-2 text-sm" placeholder="Search conversations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/></div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {pinnedChats.length > 0 && <p className="text-white/30 text-xs px-2 py-1 font-medium">PINNED</p>}
              {[...pinnedChats, ...regularChats].map(chat => (
                <div key={chat._id} onClick={() => selectChat(chat._id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${activeChat === chat._id ? 'bg-purple-600/30' : 'hover:bg-white/5'}`}>
                  <MessageSquare size={14} className="text-purple-400 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    {renamingId === chat._id ? (
                      <input className="input-field text-sm py-0.5 px-2" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveRename(chat._id); if (e.key === 'Escape') setRenamingId(null); }}
                        onClick={e => e.stopPropagation()} autoFocus/>
                    ) : (
                      <p className="text-sm font-medium text-white truncate">{chat.title}</p>
                    )}
                    <p className="text-xs text-white/30 truncate">{chat.lastMessage || 'No messages yet'}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); setRenamingId(chat._id); setRenameValue(chat.title); }} className="text-white/20 hover:text-white/60 p-1"><PenLine size={12}/></button>
                    <button onClick={e => pinChat(chat._id, e)} className={`p-1 ${chat.isPinned ? 'text-yellow-400' : 'text-white/20 hover:text-white/60'}`}><Pin size={12}/></button>
                    <button onClick={e => deleteChat(chat._id, e)} className="text-white/20 hover:text-red-400 p-1"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
              {filteredChats.length === 0 && <p className="text-center text-white/30 text-sm py-8">No conversations yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
