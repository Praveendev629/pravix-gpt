const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Project = require('../models/Project');
const Groq = require('groq-sdk');
const { v4: uuidv4 } = require('uuid');
// archiver removed — not in package.json and not used in any active route

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── List projects
router.get('/projects', protect, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user._id }, '-files.content').sort({ updatedAt: -1 });
    res.json(projects);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Create project
router.post('/projects', protect, async (req, res) => {
  try {
    const { name, description, template } = req.body;
    const defaultFile = {
      id: uuidv4(), name: 'index.html', type: 'file',
      language: 'html', parentId: null, children: [],
      content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${name}</title>\n</head>\n<body>\n  <h1>Welcome to ${name}</h1>\n</body>\n</html>`,
    };
    const project = await Project.create({ userId: req.user._id, name, description, template: template || 'blank', files: [defaultFile] });
    res.status(201).json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Get project
router.get('/projects/:id', protect, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Update file content
router.patch('/projects/:id/file', protect, async (req, res) => {
  try {
    const { fileId, content } = req.body;
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ error: 'Not found' });
    const file = project.files.id(fileId) || project.files.find(f => f.id === fileId);
    if (file) { file.content = content; file.updatedAt = new Date(); }
    project.updatedAt = new Date();
    await project.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Add file/folder
router.post('/projects/:id/file', protect, async (req, res) => {
  try {
    const { name, type, parentId, language } = req.body;
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ error: 'Not found' });
    const newNode = { id: uuidv4(), name, type, language: language || 'javascript', parentId: parentId || null, children: [], content: '' };
    project.files.push(newNode);
    await project.save();
    res.status(201).json(newNode);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Delete file
router.delete('/projects/:id/file/:fileId', protect, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    project.files = project.files.filter(f => f.id !== req.params.fileId);
    await project.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Delete project
router.delete('/projects/:id', protect, async (req, res) => {
  try {
    await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI Code Generation
router.post('/generate', protect, async (req, res) => {
  try {
    const { prompt, language, action, code } = req.body;

    let systemMsg = 'You are Pravix AI, an expert software engineer. Generate clean, production-ready code. Always wrap code in proper markdown fences with language hints.';
    let userMsg = prompt;

    if (action === 'explain') userMsg = `Explain this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;
    else if (action === 'fix') userMsg = `Fix bugs in this ${language} code and explain what was wrong:\n\`\`\`${language}\n${code}\n\`\`\``;
    else if (action === 'optimize') userMsg = `Optimize this ${language} code for performance and readability:\n\`\`\`${language}\n${code}\n\`\`\``;
    else if (action === 'refactor') userMsg = `Refactor this ${language} code following best practices:\n\`\`\`${language}\n${code}\n\`\`\``;
    else if (action === 'comment') userMsg = `Add comprehensive comments and JSDoc/docstrings to this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;
    else if (action === 'docs') userMsg = `Generate complete documentation for this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;
    else if (action === 'convert') userMsg = `Convert this code to ${language}:\n\`\`\`\n${code}\n\`\`\``;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
      stream: true,
      max_tokens: 8192,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Generate full project from description
router.post('/generate-project', protect, async (req, res) => {
  try {
    const { description } = req.body;
    const prompt = `You are Pravix AI. The user wants to build: "${description}"\n\nGenerate a complete project structure as JSON with this exact format:\n{\n  "projectName": "...",\n  "files": [\n    { "name": "index.html", "type": "file", "language": "html", "content": "..." },\n    { "name": "style.css", "type": "file", "language": "css", "content": "..." },\n    { "name": "script.js", "type": "file", "language": "javascript", "content": "..." }\n  ],\n  "description": "...",\n  "setupInstructions": "..."\n}\nMake it complete and production-ready. Return ONLY valid JSON.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // Create project in DB
    const projectFiles = result.files.map(f => ({ id: uuidv4(), name: f.name, type: f.type || 'file', language: f.language || 'javascript', parentId: f.parentId || null, children: [], content: f.content || '' }));
    const project = await Project.create({
      userId: req.user._id,
      name: result.projectName || description.slice(0, 50),
      description: result.description || description,
      template: 'ai-generated',
      files: projectFiles,
    });

    res.json({ project, setupInstructions: result.setupInstructions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Save version snapshot
router.post('/projects/:id/snapshot', protect, async (req, res) => {
  try {
    const { label } = req.body;
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    project.versions.push({ id: uuidv4(), label: label || `Version ${project.versions.length + 1}`, snapshot: project.files, createdAt: new Date() });
    if (project.versions.length > 20) project.versions.shift();
    await project.save();
    res.json({ success: true, versionCount: project.versions.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Save snippet
router.post('/projects/:id/snippet', protect, async (req, res) => {
  try {
    const { title, code, language, tags } = req.body;
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    project.snippets.push({ id: uuidv4(), title, code, language, tags: tags || [], createdAt: new Date() });
    await project.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
