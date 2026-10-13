const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function createAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN, issuer: 'chat-app-api', audience: 'chat-app' }
  );
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { createAccessToken, createRefreshToken, hashToken };
