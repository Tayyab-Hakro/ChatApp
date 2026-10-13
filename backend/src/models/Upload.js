const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, maxlength: 255 },
  mimeType: { type: String, required: true, maxlength: 120 },
  size: { type: Number, required: true, min: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Upload', uploadSchema);
