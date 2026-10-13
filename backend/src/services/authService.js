const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AppError = require('../utils/AppError');
const { createAccessToken, createRefreshToken, hashToken } = require('../utils/tokens');
const env = require('../config/env');

function refreshExpiry() {
  return new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

async function issueSession(user) {
  const refreshToken = createRefreshToken();
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiry()
  });
  return { accessToken: createAccessToken(user), refreshToken, user };
}

async function register({ name, email, password }) {
  const existing = await User.exists({ email: email.toLowerCase() });
  if (existing) throw new AppError(409, 'An account with that email already exists', 'EMAIL_IN_USE');
  const user = await User.create({ name, email: email.toLowerCase(), password });
  return issueSession(user);
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS');
  }
  return issueSession(user);
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new AppError(401, 'Refresh token is required', 'UNAUTHENTICATED');
  const tokenHash = hashToken(refreshToken);
  const existing = await RefreshToken.findOne({ tokenHash });
  if (!existing) throw new AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');

  if (existing.revokedAt) {
    await RefreshToken.updateMany({ user: existing.user, revokedAt: null }, { revokedAt: new Date() });
    throw new AppError(401, 'Refresh token reuse detected; sign in again', 'REFRESH_TOKEN_REUSE');
  }

  const now = new Date();
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: existing._id, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } },
    { new: true }
  );
  if (!claimed) throw new AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');

  const user = await User.findById(existing.user);
  if (!user) throw new AppError(401, 'Account no longer exists', 'UNAUTHENTICATED');

  const session = await issueSession(user);
  claimed.replacedBy = hashToken(session.refreshToken);
  await claimed.save();
  return session;
}

async function logout(refreshToken) {
  if (refreshToken) {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
}

module.exports = { register, login, refresh, logout };
