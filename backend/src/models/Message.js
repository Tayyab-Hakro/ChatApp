const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true, maxlength: 2048 },
  name: { type: String, required: true, maxlength: 255 },
  mimeType: { type: String, required: true, maxlength: 120 },
  size: { type: Number, required: true, min: 1 }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, trim: true, maxlength: 5000, default: '' },
  attachments: { type: [attachmentSchema], default: [] },
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
