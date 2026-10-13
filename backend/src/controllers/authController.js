const authService = require('../services/authService');
const env = require('../config/env');
const { REFRESH_TOKEN_COOKIE } = require('../constants');

const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: '/api/auth'
};

function sendSession(res, session, status = 200) {
  res.cookie(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    ...cookieOptions,
    maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
  });
  res.status(status).json({
    accessToken: session.accessToken,
    user: session.user
  });
}

async function register(req, res) {
  sendSession(res, await authService.register(req.body), 201);
}

async function login(req, res) {
  sendSession(res, await authService.login(req.body));
}

async function refresh(req, res) {
  sendSession(res, await authService.refresh(req.cookies[REFRESH_TOKEN_COOKIE]));
}

async function logout(req, res) {
  await authService.logout(req.cookies[REFRESH_TOKEN_COOKIE]);
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
  res.status(204).end();
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, refresh, logout, me };
