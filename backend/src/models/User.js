const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, select: false },
  avatarUrl: { type: String, default: null },
  bio: { type: String, maxlength: 280, default: '' },
  lastSeenAt: { type: Date, default: Date.now }
}, { timestamps: true, toJSON: { virtuals: true, transform: sanitizeUser } });

function sanitizeUser(_doc, ret) {
  delete ret.password;
  delete ret.__v;
  return ret;
}

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
