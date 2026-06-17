const mongoose = require('mongoose');

const fileNodeSchema = new mongoose.Schema({
  id: String,
  name: String,
  type: { type: String, enum: ['file', 'folder'] },
  content: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  parentId: { type: String, default: null },
  children: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  template: { type: String, default: 'blank' },
  files: [fileNodeSchema],
  versions: [{
    id: String,
    label: String,
    snapshot: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
  }],
  snippets: [{
    id: String,
    title: String,
    code: String,
    language: String,
    tags: [String],
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
