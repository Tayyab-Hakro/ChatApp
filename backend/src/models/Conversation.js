const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['member', 'admin'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  lastReadAt: { type: Date, default: null }
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct', 'group'], required: true },
  title: { type: String, trim: true, maxlength: 100, default: '' },
  participants: {
    type: [participantSchema],
    validate: {
      validator(participants) {
        return participants.length >= 2 && participants.length <= 100;
      },
      message: 'A conversation must have between 2 and 100 participants'
    }
  },
  directKey: { type: String, unique: true, sparse: true },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }
}, { timestamps: true });

conversationSchema.index({ 'participants.user': 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
