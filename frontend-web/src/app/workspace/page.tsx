"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { sql } from '@codemirror/lang-sql';
import { cpp } from '@codemirror/lang-cpp';
import { php } from '@codemirror/lang-php';
import {
  Plus, FolderPlus, Trash2, File, Folder, ChevronRight, ChevronDown as ChevDown,
  Play, RefreshCw, Maximize2, Minimize2, Copy, Download, Save, Share2,
  Wand2, Bug, Zap, FileCode2, BookOpen, ArrowLeftRight, MessageSquare,
  ChevronLeft, Settings, LogOut, Code2, Smartphone, Tablet, Monitor,
  FlaskConical, X, Check, Loader2, Search, FolderOpen
} from 'lucide-react';

type FileNode = { id: string; name: string; type: 'file' | 'folder'; content: string; language: string; parentId: string | null; children: string[]; };
type Project = { _id: string; name: string; description: string; files: FileNode[]; versions: any[]; snippets: any[]; };
type AIPanel = 'closed' | 'generate' | 'assistant';
type ViewMode = 'desktop' | 'tablet' | 'mobile';

const LANG_MAP: Record<string, any> = { javascript: javascript({ jsx: true, typescript: false }), typescript: javascript({ jsx: true, typescript: true }), jsx: javascript({ jsx: true }), tsx: javascript({ jsx: true, typescript: true }), html: html(), css: css(), python: python(), java: java(), sql: sql(), cpp: cpp(), c: cpp(), php: php() };
const EXT_LANG: Record<string, string> = { js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx', html: 'html', css: 'css', py: 'python', java: 'java', sql: 'sql', cpp: 'cpp', c: 'c', php: 'php', json: 'javascript', md: 'javascript' };

function detectLang(name: string) { return EXT_LANG[name.split('.').pop() || ''] || 'javascript'; }

const LANGUAGES = ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React (JSX)', 'React (TSX)', 'Next.js', 'Node.js', 'Python', 'Java', 'C', 'C++', 'C#', 'PHP', 'SQL', 'MongoDB'];

export default function WorkspacePage() {
  const { user, chatUsername, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [aiPanel, setAiPanel] = useState<AIPanel>('closed');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [showProjects, setShowProjects] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedLang, setSelectedLang] = useState('JavaScript');
  const [aiAction, setAiAction] = useState<string>('');
  const [projectGenerating, setProjectGenerating] = useState(false);
  const saveTimer = useRef<any>(null);

  useEffect(() => { if (!authLoading && !user) router.replace('/auth/login'); }, [user, authLoading, router]);
  useEffect(() => { if (user) loadProjects(); }, [user]);

  const loadProjects = async () => {
    try { const { data } = await api.get('/api/workspace/projects'); setProjects(data); } catch { }
  };

  const loadProject = async (id: string) => {
    try { const { data } = await api.get(`/api/workspace/projects/${id}`); setActiveProject(data); setActiveFile(data.files[0] || null); } catch { }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const { data } = await api.post('/api/workspace/projects', { name: newProjectName });
      setProjects(prev => [data, ...prev]);
      await loadProject(data._id);
      setShowNewProject(false);
      setNewProjectName('');
      toast.success('Project created!');
    } catch { toast.error('Failed to create project'); }
  };

  const deleteProject = async (id: string) => {
    try {
      await api.delete(`/api/workspace/projects/${id}`);
      setProjects(prev => prev.filter(p => p._id !== id));
      if (activeProject?._id === id) setActiveProject(null);
      toast.success('Project deleted');
    } catch { toast.error('Failed to delete project'); }
  };

  const addFile = async (type: 'file' | 'folder') => {
    if (!activeProject) return;
    const name = prompt(`Enter ${type} name:`, type === 'file' ? 'newfile.js' : 'newfolder');
    if (!name) return;
    try {
      const { data } = await api.post(`/api/workspace/projects/${activeProject._id}/file`, { name, type, language: detectLang(name) });
      setActiveProject(prev => prev ? { ...prev, files: [...prev.files, data] } : prev);
      if (type === 'file') setActiveFile(data);
    } catch { toast.error('Failed to create file'); }
  };

  const deleteFile = async (fileId: string) => {
    if (!activeProject) return;
    try {
      await api.delete(`/api/workspace/projects/${activeProject._id}/file/${fileId}`);
      setActiveProject(prev => prev ? { ...prev, files: prev.files.filter(f => f.id !== fileId) } : prev);
      if (activeFile?.id === fileId) setActiveFile(activeProject.files.find(f => f.id !== fileId) || null);
    } catch { }
  };

  const saveFile = useCallback(async (content: string) => {
    if (!activeProject || !activeFile) return;
    setSaveStatus('saving');
    try {
      await api.patch(`/api/workspace/projects/${activeProject._id}/file`, { fileId: activeFile.id, content });
      setActiveProject(prev => prev ? { ...prev, files: prev.files.map(f => f.id === activeFile.id ? { ...f, content } : f) } : prev);
      setSaveStatus('saved');
    } catch { setSaveStatus('unsaved'); }
  }, [activeProject, activeFile]);

  const onCodeChange = (value: string) => {
    if (!activeFile) return;
    setActiveFile(prev => prev ? { ...prev, content: value } : prev);
    setSaveStatus('unsaved');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveFile(value), 1500);
  };

  // Build preview HTML from project files
  const buildPreview = () => {
    if (!activeProject) return '';
    const htmlFile = activeProject.files.find(f => f.name.endsWith('.html') && f.type === 'file');
    const cssFile = activeProject.files.find(f => f.name.endsWith('.css') && f.type === 'file');
    const jsFile = activeProject.files.find(f => (f.name.endsWith('.js') || f.name.endsWith('.jsx')) && f.type === 'file');
    if (htmlFile) {
      let src = htmlFile.content;
      if (cssFile) src = src.replace('</head>', `<style>${cssFile.content}</style></head>`);
      if (jsFile) src = src.replace('</body>', `<script>${jsFile.content}<\/script></body>`);
      return src;
    }
    if (activeFile?.language === 'html') return activeFile.content;
    if (activeFile?.language === 'css') return `<!DOCTYPE html><html><head><style>${activeFile.content}</style></head><body><p style="color:white;font-family:sans-serif;padding:1rem">CSS Preview</p></body></html>`;
    return `<!DOCTYPE html><html><head><style>body{background:#111;color:#fff;font-family:monospace;padding:1rem}</style></head><body><pre>${activeFile?.content || ''}<\/pre></body></html>`;
  };

  // AI Code Generation
  const runAI = async (action: string = '', prompt?: string) => {
    if (!activeProject) return;
    setAiStreaming(true);
    setAiResponse('');
    const body: any = { language: (selectedLang || activeFile?.language || 'javascript').toLowerCase() };
    if (action) { body.action = action; body.code = activeFile?.content || ''; }
    else { body.prompt = prompt || aiPrompt; }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workspace/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('pravix_token')}` },
        body: JSON.stringify(body),
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        decoder.decode(value).split('\n').forEach(line => {
          if (line.startsWith('data: ')) {
            try { const p = JSON.parse(line.slice(6)); if (p.delta) { full += p.delta; setAiResponse(full); } } catch { }
          }
        });
      }
      // Extract code block if present
      const codeMatch = full.match(/```(?:\w+)?\n([\s\S]*?)```/);
      if (codeMatch && activeFile) {
        const extracted = codeMatch[1];
        setActiveFile(prev => prev ? { ...prev, content: extracted } : prev);
        await saveFile(extracted);
      }
    } catch { toast.error('AI generation failed'); } finally { setAiStreaming(false); }
  };

  const generateFullProject = async () => {
    if (!aiPrompt) return;
    setProjectGenerating(true);
    try {
      const { data } = await api.post('/api/workspace/generate-project', { description: aiPrompt });
      setProjects(prev => [data.project, ...prev]);
      await loadProject(data.project._id);
      setAiPanel('closed');
      setAiPrompt('');
      toast.success(`Project "${data.project.name}" created!`);
      if (data.setupInstructions) toast(data.setupInstructions, { duration: 8000 });
    } catch { toast.error('Failed to generate project'); } finally { setProjectGenerating(false); }
  };

  const copyCode = () => { if (activeFile) { navigator.clipboard.writeText(activeFile.content); toast.success('Copied!'); } };
  const downloadCode = () => {
    if (!activeFile) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([activeFile.content], { type: 'text/plain' }));
    a.download = activeFile.name;
    a.click();
  };
  const downloadProject = () => {
    if (!activeProject) return;
    // Simple JSON download for now (real ZIP needs JSZip)
    const a = document.createElement('a');
    const data = JSON.stringify({ name: activeProject.name, files: activeProject.files }, null, 2);
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `${activeProject.name}.json`;
    a.click();
    toast.success('Project exported');
  };

  const viewWidths: Record<ViewMode, string> = { desktop: '100%', tablet: '768px', mobile: '390px' };

  if (authLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="flex gap-2"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div></div>;

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ height: '100dvh' }}>
      {/* Top Bar */}
      <header className="glass border-b border-white/5 px-4 py-2.5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/chat')} className="text-white/40 hover:text-white p-1.5 transition-colors"><ChevronLeft size={16}/></button>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#EF4444)' }}>
            <Code2 size={14} color="white"/>
          </div>
          <span className="font-bold gradient-text text-sm hidden sm:block">Pravix Workspace</span>
          {activeProject && <span className="text-white/40 text-sm hidden md:block">/ {activeProject.name}</span>}
          {activeFile && <span className="text-white/25 text-sm hidden md:block">/ {activeFile.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* Save status */}
          <span className={`text-xs px-2 py-1 rounded-lg ${saveStatus === 'saved' ? 'text-green-400/70' : saveStatus === 'saving' ? 'text-yellow-400/70' : 'text-red-400/70'}`}>
            {saveStatus === 'saving' ? <Loader2 size={10} className="animate-spin inline mr-1"/> : null}
            {saveStatus}
          </span>
          {/* Preview controls */}
          {showPreview && (
            <div className="flex items-center gap-1 glass rounded-lg p-1">
              {(['desktop', 'tablet', 'mobile'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setViewMode(m)} className={`p-1.5 rounded-md transition-all ${viewMode === m ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'}`}>
                  {m === 'desktop' ? <Monitor size={13}/> : m === 'tablet' ? <Tablet size={13}/> : <Smartphone size={13}/>}
                </button>
              ))}
              <button onClick={() => setPreviewKey(k => k + 1)} className="p-1.5 text-white/40 hover:text-white transition-all"><RefreshCw size={13}/></button>
              <button onClick={() => setPreviewFullscreen(!previewFullscreen)} className="p-1.5 text-white/40 hover:text-white transition-all">
                {previewFullscreen ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
              </button>
            </div>
          )}
          <button onClick={() => setShowPreview(!showPreview)} className={`btn-glass px-2.5 py-1.5 text-xs ${showPreview ? 'border-purple-500/50' : ''}`}>
            <Play size={12}/>{showPreview ? 'Hide' : 'Preview'}
          </button>
          <button onClick={() => setAiPanel(aiPanel === 'generate' ? 'closed' : 'generate')} className="btn-primary px-3 py-1.5 text-xs">
            <Wand2 size={12}/> AI Generate
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: File Manager */}
        <aside className="w-56 glass border-r border-white/5 flex flex-col shrink-0 overflow-hidden">
          {/* Project switcher */}
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40 font-medium uppercase tracking-wide">Projects</span>
              <button onClick={() => setShowNewProject(true)} className="text-white/40 hover:text-purple-400 transition-colors"><Plus size={14}/></button>
            </div>
            {showNewProject && (
              <div className="flex gap-1 mb-2">
                <input className="input-field text-xs py-1 flex-1" placeholder="Project name..." value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createProject(); if (e.key === 'Escape') setShowNewProject(false); }} autoFocus/>
                <button onClick={createProject} className="text-green-400 p-1"><Check size={12}/></button>
                <button onClick={() => setShowNewProject(false)} className="text-white/40 p-1"><X size={12}/></button>
              </div>
            )}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {projects.map(p => (
                <div key={p._id} onClick={() => loadProject(p._id)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-all group ${activeProject?._id === p._id ? 'bg-purple-600/30 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
                  <FolderOpen size={12} className="shrink-0"/>
                  <span className="truncate flex-1">{p.name}</span>
                  <button onClick={e => { e.stopPropagation(); deleteProject(p._id); }} className="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity"><Trash2 size={10}/></button>
                </div>
              ))}
            </div>
          </div>

          {/* File tree */}
          {activeProject && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40 font-medium uppercase tracking-wide">Files</span>
                  <div className="flex gap-1">
                    <button onClick={() => addFile('file')} title="New file" className="text-white/40 hover:text-purple-400 transition-colors p-0.5"><FilePlus2Icon/></button>
                    <button onClick={() => addFile('folder')} title="New folder" className="text-white/40 hover:text-purple-400 transition-colors p-0.5"><FolderPlus size={13}/></button>
                  </div>
                </div>
              </div>
              <div className="p-2">
                {activeProject.files.filter(f => !f.parentId).map(f => (
                  <FileTreeNode key={f.id} node={f} allFiles={activeProject.files} activeId={activeFile?.id || ''} onSelect={n => setActiveFile(n)} onDelete={deleteFile} expanded={expandedFolders} onToggle={id => setExpandedFolders(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; })}/>
                ))}
              </div>
            </div>
          )}

          {/* Bottom actions */}
          {activeProject && (
            <div className="p-3 border-t border-white/5 space-y-1">
              <button onClick={downloadProject} className="btn-glass w-full text-xs py-2 gap-1.5">
                <Download size={12}/> Export Project
              </button>
              <button onClick={() => { api.post(`/api/workspace/projects/${activeProject._id}/snapshot`, { label: `v${activeProject.versions.length + 1}` }); toast.success('Version saved!'); }} className="btn-glass w-full text-xs py-2 gap-1.5">
                <Save size={12}/> Save Version
              </button>
            </div>
          )}
        </aside>

        {/* Center: Code Editor */}
        <div className={`flex flex-col flex-1 overflow-hidden ${showPreview && !previewFullscreen ? 'w-1/2' : 'w-full'}`}>
          {activeFile ? (
            <>
              {/* Editor toolbar */}
              <div className="glass border-b border-white/5 px-3 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-sm">
                  <FileCode2 size={13} className="text-purple-400"/>
                  <span className="text-white/70 text-xs">{activeFile.name}</span>
                  <span className="text-white/25 text-xs">•</span>
                  <span className="text-white/30 text-xs">{activeFile.language}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={copyCode} title="Copy" className="p-1.5 text-white/30 hover:text-white transition-colors"><Copy size={13}/></button>
                  <button onClick={downloadCode} title="Download" className="p-1.5 text-white/30 hover:text-white transition-colors"><Download size={13}/></button>
                  <button onClick={() => saveFile(activeFile.content)} title="Save" className="p-1.5 text-white/30 hover:text-green-400 transition-colors"><Save size={13}/></button>
                  {/* AI actions */}
                  <div className="flex gap-1 ml-2 border-l border-white/10 pl-2">
                    {[{ icon: <Bug size={12}/>, label: 'Fix', action: 'fix' }, { icon: <Zap size={12}/>, label: 'Optimize', action: 'optimize' }, { icon: <BookOpen size={12}/>, label: 'Explain', action: 'explain' }, { icon: <MessageSquare size={12}/>, label: 'Comment', action: 'comment' }].map(a => (
                      <button key={a.action} onClick={() => { setAiPanel('assistant'); setAiAction(a.action); setTimeout(() => runAI(a.action), 100); }} title={a.label} className="p-1.5 text-white/30 hover:text-purple-400 transition-colors flex items-center gap-1 text-xs">{a.icon}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <CodeMirror
                  value={activeFile.content}
                  height="100%"
                  theme={oneDark}
                  extensions={[LANG_MAP[activeFile.language] || javascript()]}
                  onChange={onCodeChange}
                  basicSetup={{ lineNumbers: true, autocompletion: true, foldGutter: true, searchKeymap: true, tabSize: 2 }}
                  style={{ fontSize: '13px', height: '100%' }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#EF4444)' }}>
                <Code2 size={28} color="white"/>
              </div>
              <div>
                <h2 className="text-xl font-bold gradient-text">Pravix Workspace</h2>
                <p className="text-white/40 mt-2 text-sm">Create a project or describe what to build</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewProject(true)} className="btn-primary"><Plus size={14}/> New Project</button>
                <button onClick={() => setAiPanel('generate')} className="btn-glass"><Wand2 size={14}/> AI Generate</button>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-sm w-full">
                {['Student Management System', 'E-commerce Landing Page', 'Todo App with React', 'REST API with Node.js'].map(s => (
                  <button key={s} onClick={() => { setAiPanel('generate'); setAiPrompt(s); }} className="btn-glass text-xs text-left py-3 px-4">{s}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        {showPreview && (
          <div className={`${previewFullscreen ? 'fixed inset-0 z-50 bg-black' : 'flex flex-col border-l border-white/5 overflow-hidden'}`}
            style={previewFullscreen ? undefined : { width: '40%', minWidth: '300px' }}>
            <div className="glass border-b border-white/5 px-3 py-2 flex items-center justify-between shrink-0">
              <span className="text-xs text-white/40 font-medium">Live Preview</span>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1 glass rounded-lg p-0.5">
                  {(['desktop', 'tablet', 'mobile'] as ViewMode[]).map(m => (
                    <button key={m} onClick={() => setViewMode(m)} className={`p-1 rounded transition-all ${viewMode === m ? 'bg-purple-600 text-white' : 'text-white/40'}`}>
                      {m === 'desktop' ? <Monitor size={11}/> : m === 'tablet' ? <Tablet size={11}/> : <Smartphone size={11}/>}
                    </button>
                  ))}
                </div>
                <button onClick={() => setPreviewKey(k => k + 1)} className="p-1 text-white/40 hover:text-white"><RefreshCw size={12}/></button>
                <button onClick={() => setPreviewFullscreen(!previewFullscreen)} className="p-1 text-white/40 hover:text-white">
                  {previewFullscreen ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}
                </button>
                {previewFullscreen && <button onClick={() => setPreviewFullscreen(false)} className="p-1 text-white/40 hover:text-white"><X size={12}/></button>}
              </div>
            </div>
            <div className="flex-1 flex items-start justify-center overflow-auto bg-[#1a1a2e] p-2">
              <div className="transition-all duration-300 shadow-2xl" style={{ width: viewWidths[viewMode], height: '100%', minHeight: '400px' }}>
                <iframe key={previewKey} srcDoc={buildPreview()} className="w-full h-full border-0 rounded-lg" title="Live Preview" sandbox="allow-scripts allow-same-origin"/>
              </div>
            </div>
          </div>
        )}

        {/* AI Panel (right drawer) */}
        {aiPanel !== 'closed' && (
          <div className="w-80 glass border-l border-white/5 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => setAiPanel('generate')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${aiPanel === 'generate' ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`}>
                  <Wand2 size={11} className="inline mr-1"/> Generate
                </button>
                <button onClick={() => setAiPanel('assistant')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${aiPanel === 'assistant' ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`}>
                  <FlaskConical size={11} className="inline mr-1"/> Assistant
                </button>
              </div>
              <button onClick={() => setAiPanel('closed')} className="text-white/30 hover:text-white"><X size={14}/></button>
            </div>

            {aiPanel === 'generate' && (
              <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Language / Framework</label>
                  <select className="input-field text-xs py-2" value={selectedLang} onChange={e => setSelectedLang(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l} value={l} className="bg-gray-900">{l}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white/40 mb-1 block">Describe what to generate</label>
                  <textarea className="input-field text-xs resize-none" rows={6} placeholder="e.g. Create a Student Management System with CRUD operations..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}/>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => runAI()} disabled={!aiPrompt || aiStreaming} className="btn-primary flex-1 text-xs py-2">
                    {aiStreaming ? <><Loader2 size={12} className="animate-spin"/> Generating...</> : <><Wand2 size={12}/> Generate Code</>}
                  </button>
                  <button onClick={generateFullProject} disabled={!aiPrompt || projectGenerating} className="btn-glass text-xs py-2 px-3" title="Generate full project">
                    {projectGenerating ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>}
                  </button>
                </div>
                {aiResponse && (
                  <div className="glass rounded-xl p-3 text-xs text-white/70 overflow-y-auto max-h-48 whitespace-pre-wrap font-mono">
                    {aiResponse}
                  </div>
                )}
              </div>
            )}

            {aiPanel === 'assistant' && (
              <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Explain Code', action: 'explain', icon: <BookOpen size={12}/> },
                    { label: 'Fix Bugs', action: 'fix', icon: <Bug size={12}/> },
                    { label: 'Optimize', action: 'optimize', icon: <Zap size={12}/> },
                    { label: 'Refactor', action: 'refactor', icon: <RefreshCw size={12}/> },
                    { label: 'Add Comments', action: 'comment', icon: <MessageSquare size={12}/> },
                    { label: 'Generate Docs', action: 'docs', icon: <FileCode2 size={12}/> },
                  ].map(a => (
                    <button key={a.action} onClick={() => runAI(a.action)} disabled={aiStreaming || !activeFile}
                      className="btn-glass text-xs py-2.5 gap-1.5 flex items-center justify-center">
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Convert to language</label>
                  <div className="flex gap-2">
                    <select className="input-field text-xs py-2 flex-1" value={selectedLang} onChange={e => setSelectedLang(e.target.value)}>
                      {LANGUAGES.map(l => <option key={l} value={l} className="bg-gray-900">{l}</option>)}
                    </select>
                    <button onClick={() => runAI('convert')} disabled={aiStreaming || !activeFile} className="btn-glass text-xs px-3">
                      <ArrowLeftRight size={12}/>
                    </button>
                  </div>
                </div>
                {aiStreaming && (
                  <div className="flex gap-2 items-center text-purple-400 text-xs">
                    <Loader2 size={12} className="animate-spin"/> AI is working...
                  </div>
                )}
                {aiResponse && (
                  <div className="glass rounded-xl p-3 text-xs text-white/70 overflow-y-auto flex-1 whitespace-pre-wrap">
                    {aiResponse}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Small helper component
function FilePlus2Icon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>;
}

interface FileTreeNodeProps { node: FileNode; allFiles: FileNode[]; activeId: string; onSelect: (n: FileNode) => void; onDelete: (id: string) => void; expanded: Set<string>; onToggle: (id: string) => void; depth?: number; }

function FileTreeNode({ node, allFiles, activeId, onSelect, onDelete, expanded, onToggle, depth = 0 }: FileTreeNodeProps) {
  const children = allFiles.filter(f => f.parentId === node.id);
  const isExpanded = expanded.has(node.id);
  const isActive = node.id === activeId;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer text-xs transition-all group ${isActive ? 'bg-purple-600/30 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => { if (node.type === 'folder') onToggle(node.id); else onSelect(node); }}>
        {node.type === 'folder'
          ? <>{isExpanded ? <ChevDown size={10}/> : <ChevronRight size={10}/>}<Folder size={12} className="text-yellow-400"/></>
          : <><span className="w-2.5"/><File size={12} className="text-purple-400"/></>}
        <span className="truncate flex-1">{node.name}</span>
        <button onClick={e => { e.stopPropagation(); onDelete(node.id); }} className="opacity-0 group-hover:opacity-100 text-red-400 p-0.5 transition-opacity"><Trash2 size={10}/></button>
      </div>
      {node.type === 'folder' && isExpanded && children.map(c => (
        <FileTreeNode key={c.id} node={c} allFiles={allFiles} activeId={activeId} onSelect={onSelect} onDelete={onDelete} expanded={expanded} onToggle={onToggle} depth={depth + 1}/>
      ))}
    </div>
  );
}
