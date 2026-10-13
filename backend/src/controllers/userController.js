const User = require('../models/User');
const AppError = require('../utils/AppError');

async function search(req, res) {
  const query = req.query.q.trim();
  if (query.length < 2) {
    throw new AppError(400, 'Search query must contain at least 2 characters', 'VALIDATION_ERROR');
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } }
    ]
  }).select('name email avatarUrl lastSeenAt').limit(20);
  res.json({ users });
}

async function updateProfile(req, res) {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ user });
}

module.exports = { search, updateProfile };
