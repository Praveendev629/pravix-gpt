"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { streamChat, getHistory, getMessages, deleteChat, renameChat, analyzeFile } from "@/lib/api";
import { useTheme, THEME_COLORS, ThemeColor } from "@/context/ThemeContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import toast from "react-hot-toast";
import {
  Send, Plus, History, Trash2, Edit3, Search, X, Copy, RefreshCw,
  Share2, ChevronDown, Paperclip, Settings, LogOut, Bot, User as UserIcon,
  Download, Palette, Check, Menu
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Fast" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B" },
  { id: "qwen-qwq-32b", name: "Qwen QwQ 32B" },
  { id: "llama-3.2-11b-vision-preview", name: "Llama Vision (Image Analysis)" },
];

interface Message { role: "user" | "assistant"; content: string; id: string; fileInfo?: { name: string; type: string }; }
interface Chat { chatId: string; title: string; updatedAt: string; }

const THEME_OPTIONS: { id: ThemeColor; label: string; }[] = [
  { id: "purple", label: "Purple" },
  { id: "red", label: "Red" },
  { id: "green", label: "Green" },
  { id: "orange", label: "Orange" },
  { id: "blue", label: "Blue" },
  { id: "cyan", label: "Cyan" },
];

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme, setTheme, primary } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();
  const [model, setModel] = useState(MODELS[0].id);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<Chat[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState("");
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadHistory = useCallback(async () => {
    try { setHistory(await getHistory()); } catch {}
  }, []);

  useEffect(() => { if (user) loadHistory(); }, [user, loadHistory]);

  const newChat = () => {
    setMessages([]);
    setCurrentChatId(undefined);
    setInput("");
    setAttachedFile(null);
    setFileAnalysis("");
    setShowHistory(false);
  };

  const loadChat = async (chatId: string) => {
    try {
      const msgs = await getMessages(chatId);
      setMessages(msgs.map((m: any) => ({ ...m, id: m._id || uuidv4() })));
      setCurrentChatId(chatId);
      setShowHistory(false);
    } catch { toast.error("Failed to load chat"); }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);

    if (file.type.startsWith("image/")) {
      toast.success("Image attached. Ask a question about it.");
    } else {
      setAnalyzingFile(true);
      try {
        const q = input || "Analyze this file and summarize its content.";
        const result = await analyzeFile(file, q);
        setFileAnalysis(result.analysis);
        toast.success("File analyzed successfully!");
      } catch { toast.error("File analysis failed"); }
      finally { setAnalyzingFile(false); }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !fileAnalysis) || streaming) return;

    let userContent = input.trim();
    let imageBase64: string | undefined;

    if (fileAnalysis) {
      userContent = `[File: ${attachedFile?.name}]\n\n${fileAnalysis}\n\nUser: ${userContent || "Please summarize and explain this."}`;
      setFileAnalysis("");
      setAttachedFile(null);
    }

    if (attachedFile?.type.startsWith("image/")) {
      const reader = new FileReader();
      imageBase64 = await new Promise<string>(resolve => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(attachedFile);
      });
      setAttachedFile(null);
    }

    const userMsg: Message = { role: "user", content: userContent, id: uuidv4() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    const assistantId = uuidv4();
    setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantId }]);
    setStreaming(true);

    try {
      await streamChat({
        chatId: currentChatId,
        message: userContent,
        model,
        history: messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
        imageBase64,
        onDelta: (text) => {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + text } : m));
        },
        onDone: (cId) => {
          setCurrentChatId(cId);
          loadHistory();
        },
        onError: (err) => toast.error(err)
      });
    } finally { setStreaming(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied!");
  };

  const regenerate = async () => {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    setMessages(prev => prev.slice(0, -1));
    const assistantId = uuidv4();
    setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantId }]);
    setStreaming(true);
    try {
      await streamChat({
        chatId: currentChatId, message: lastUser.content, model,
        history: messages.slice(0, -2).map(m => ({ role: m.role, content: m.content })),
        onDelta: (text) => {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + text } : m));
        },
        onDone: () => {}, onError: (err) => toast.error(err)
      });
    } finally { setStreaming(false); }
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    if (currentChatId === chatId) newChat();
    setHistory(prev => prev.filter(c => c.chatId !== chatId));
    toast.success("Chat deleted");
  };

  const handleRename = async (chatId: string) => {
    await renameChat(chatId, editTitle);
    setHistory(prev => prev.map(c => c.chatId === chatId ? { ...c, title: editTitle } : c));
    setEditingChat(null);
  };

  const downloadContent = (content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pravix-response.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const groupedHistory = {
    today: history.filter(c => {
      const d = new Date(c.updatedAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }),
    yesterday: history.filter(c => {
      const d = new Date(c.updatedAt);
      const now = new Date();
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      return d.toDateString() === yesterday.toDateString();
    }),
    older: history.filter(c => {
      const d = new Date(c.updatedAt);
      const now = new Date();
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      return d < yesterday;
    })
  };

  const filteredHistory = (chats: Chat[]) =>
    chats.filter(c => c.title.toLowerCase().includes(historySearch.toLowerCase()));

  if (loading) return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <motion.div className="flex gap-2">
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-3 h-3 rounded-full bg-[var(--primary)]"
            animate={{ scale: [1,1.5,1] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </motion.div>
    </div>
  );

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-[#0a0a0a] border-r border-white/5 p-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <Image src="/logo.jpg" alt="PRAVIX AI" width={32} height={32} className="w-full h-full object-cover" />
          </div>
          <span className="font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
            PRAVIX AI
          </span>
        </div>

        <button onClick={newChat}
          className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] border border-[var(--primary)]/30 transition-all text-sm font-medium">
          <Plus size={16} /> New Chat
        </button>

        <div className="flex-1 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Recent</p>
          {history.slice(0, 20).map(chat => (
            <button key={chat.chatId} onClick={() => loadChat(chat.chatId)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 truncate transition-all ${currentChatId === chat.chatId ? "bg-[var(--primary)]/10 text-[var(--primary)]" : ""}`}>
              {chat.title}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center gap-3 mb-3">
            {user?.photoURL ? (
              <Image src={user.photoURL} alt="Avatar" width={32} height={32} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/30 flex items-center justify-center">
                <UserIcon size={16} className="text-[var(--primary)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.displayName || "User"}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowThemePicker(!showThemePicker)}
              className="flex-1 flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs text-gray-400 hover:bg-white/5 transition-all">
              <Palette size={14} /> Theme
            </button>
            <button onClick={() => { signOut(auth); router.replace("/login"); }}
              className="flex-1 flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs text-red-400 hover:bg-red-400/10 transition-all">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
          {showThemePicker && (
            <div className="mt-2 grid grid-cols-3 gap-1">
              {THEME_OPTIONS.map(t => (
                <button key={t.id} onClick={() => { setTheme(t.id); setShowThemePicker(false); }}
                  className="flex items-center gap-1 py-1 px-2 rounded-lg text-xs text-gray-300 hover:bg-white/5 transition-all"
                  style={{ borderLeft: `2px solid ${THEME_COLORS[t.id]}` }}>
                  {theme === t.id && <Check size={10} />}
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(true)} className="md:hidden p-2 rounded-lg hover:bg-white/5 text-gray-400">
              <Menu size={20} />
            </button>
            {/* Model Selector */}
            <div className="relative">
              <button onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-2 py-1.5 px-3 rounded-xl gradient-border text-sm text-gray-300 hover:bg-white/5 transition-all">
                <Bot size={14} className="text-[var(--primary)]" />
                {MODELS.find(m => m.id === model)?.name || "Model"}
                <ChevronDown size={14} />
              </button>
              <AnimatePresence>
                {showModelMenu && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="absolute top-10 left-0 z-50 glass rounded-xl border border-white/10 p-1 min-w-[220px]">
                    {MODELS.map(m => (
                      <button key={m.id} onClick={() => { setModel(m.id); setShowModelMenu(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${model === m.id ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "text-gray-300 hover:bg-white/5"}`}>
                        {model === m.id && <Check size={12} />}
                        {m.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={newChat} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all">
              <Plus size={18} />
            </button>
            <button onClick={() => { setShowHistory(true); loadHistory(); }}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all">
              <History size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-16 h-16 rounded-2xl overflow-hidden neon-glow">
                <Image src="/logo.jpg" alt="PRAVIX AI" width={64} height={64} className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-1">PRAVIX AI</h2>
                <p className="text-gray-400">How can I help you today?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {["Explain quantum computing", "Write a Python function", "Analyze this image", "Generate a report"].map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    className="text-left px-4 py-3 glass rounded-xl text-sm text-gray-300 hover:border-[var(--primary)]/50 border border-white/10 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 neon-glow">
                  <Image src="/logo.jpg" alt="AI" width={32} height={32} className="w-full h-full object-cover" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30 text-white"
                  : "glass text-gray-100"
              }`}>
                {msg.role === "assistant" && msg.content === "" && streaming ? (
                  <div className="typing-dots flex items-center gap-1 py-1">
                    <span className="w-2 h-2 bg-[var(--primary)] rounded-full" />
                    <span className="w-2 h-2 bg-[var(--primary)] rounded-full" />
                    <span className="w-2 h-2 bg-[var(--primary)] rounded-full" />
                  </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}
                    components={{
                      code({ node, className, children, ...props }) {
                        const isBlock = className?.includes("language-");
                        return isBlock ? (
                          <div className="relative group">
                            <pre className={className}><code {...props}>{children}</code></pre>
                            <button onClick={() => copyMessage(String(children))}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-white/10 text-gray-300 hover:text-white transition-all">
                              <Copy size={12} />
                            </button>
                          </div>
                        ) : <code className={className} {...props}>{children}</code>;
                      }
                    }}>
                    {msg.content}
                  </ReactMarkdown>
                )}

                {msg.role === "assistant" && msg.content && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                    <button onClick={() => copyMessage(msg.content)}
                      className="p-1 rounded text-gray-500 hover:text-gray-300 transition-all"><Copy size={13} /></button>
                    <button onClick={() => downloadContent(msg.content)}
                      className="p-1 rounded text-gray-500 hover:text-gray-300 transition-all"><Download size={13} /></button>
                    {i === messages.length - 1 && (
                      <button onClick={regenerate} disabled={streaming}
                        className="p-1 rounded text-gray-500 hover:text-gray-300 transition-all disabled:opacity-50">
                        <RefreshCw size={13} />
                      </button>
                    )}
                    <button onClick={() => { navigator.share?.({ text: msg.content }) || copyMessage(msg.content); }}
                      className="p-1 rounded text-gray-500 hover:text-gray-300 transition-all"><Share2 size={13} /></button>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/30 flex-shrink-0 flex items-center justify-center">
                  {user?.photoURL ? (
                    <Image src={user.photoURL} alt="You" width={32} height={32} className="w-full h-full rounded-full" />
                  ) : <UserIcon size={16} className="text-[var(--primary)]" />}
                </div>
              )}
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/5">
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 glass rounded-xl border border-white/10 w-fit">
              <Paperclip size={14} className="text-[var(--primary)]" />
              <span className="text-sm text-gray-300">{attachedFile.name}</span>
              {analyzingFile && <RefreshCw size={12} className="animate-spin text-[var(--primary)]" />}
              <button onClick={() => { setAttachedFile(null); setFileAnalysis(""); }}
                className="text-gray-500 hover:text-white"><X size={12} /></button>
            </div>
          )}
          <div className="flex gap-3 items-end gradient-border rounded-2xl p-3">
            <button onClick={() => fileRef.current?.click()}
              className="p-2 rounded-xl text-gray-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all flex-shrink-0">
              <Paperclip size={18} />
            </button>
            <input ref={fileRef} type="file" className="hidden"
              accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.json"
              onChange={handleFileAttach} />
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Message PRAVIX AI..." rows={1}
              className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-sm max-h-32"
              style={{ height: "auto" }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
            />
            <button onClick={handleSend} disabled={streaming || (!input.trim() && !fileAnalysis)}
              className="p-2 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-all disabled:opacity-50 flex-shrink-0">
              {streaming ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* History Sheet */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowHistory(false)} />
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 h-full w-80 bg-[#0a0a0a] border-r border-white/10 z-50 flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Chat History</h2>
                <button onClick={() => setShowHistory(false)} className="p-1 text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search chats..." value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {[["Today", groupedHistory.today], ["Yesterday", groupedHistory.yesterday], ["Older", groupedHistory.older]].map(([label, chats]) => {
                  const filtered = filteredHistory(chats as Chat[]);
                  if (!filtered.length) return null;
                  return (
                    <div key={label as string}>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">{label as string}</p>
                      {filtered.map(chat => (
                        <div key={chat.chatId} className="flex items-center gap-2 group">
                          {editingChat === chat.chatId ? (
                            <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                              onBlur={() => handleRename(chat.chatId)}
                              onKeyDown={e => e.key === "Enter" && handleRename(chat.chatId)}
                              className="flex-1 bg-white/5 border border-[var(--primary)] rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
                              autoFocus />
                          ) : (
                            <button onClick={() => loadChat(chat.chatId)}
                              className={`flex-1 text-left px-3 py-2 rounded-lg text-sm truncate transition-all ${currentChatId === chat.chatId ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "text-gray-300 hover:bg-white/5"}`}>
                              {chat.title}
                            </button>
                          )}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setEditingChat(chat.chatId); setEditTitle(chat.title); }}
                              className="p-1 text-gray-500 hover:text-gray-300"><Edit3 size={13} /></button>
                            <button onClick={() => handleDeleteChat(chat.chatId)}
                              className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
