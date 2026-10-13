const pino = require('pino');
const env = require('../config/env');

module.exports = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'refreshToken'],
    censor: '[REDACTED]'
  }
});
