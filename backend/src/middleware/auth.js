const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const requireAuth = asyncHandler(async (req, _res, next) => {
  const authorization = req.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  let claims;
  try {
    claims = jwt.verify(authorization.slice(7), env.JWT_ACCESS_SECRET, {
      issuer: 'chat-app-api',
      audience: 'chat-app'
    });
  } catch (_error) {
    throw new AppError(401, 'Invalid or expired access token', 'INVALID_ACCESS_TOKEN');
  }
  const user = await User.findById(claims.sub);
  if (!user) throw new AppError(401, 'Account no longer exists', 'UNAUTHENTICATED');
  req.user = user;
  next();
});

module.exports = { requireAuth };
