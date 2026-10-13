const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/chat_app'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
    .default('development-only-secret-change-this-before-deploying'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().max(365).default(30),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  UPLOAD_STORAGE_ADAPTER: z.string().default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  UPLOAD_MAX_SIZE_BYTES: z.coerce.number().int().positive().max(25 * 1024 * 1024).default(5 * 1024 * 1024),
  LOG_LEVEL: z.string().default('info')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_ACCESS_SECRET.startsWith('development-only-')) {
  throw new Error('JWT_ACCESS_SECRET must be set to a unique secret in production');
}
if (parsed.data.NODE_ENV === 'production' &&
    (!process.env.MONGODB_URI || !process.env.CLIENT_ORIGIN || !parsed.data.COOKIE_SECURE)) {
  throw new Error('MONGODB_URI, CLIENT_ORIGIN, and COOKIE_SECURE=true are required in production');
}
if (parsed.data.COOKIE_SAME_SITE === 'none' && !parsed.data.COOKIE_SECURE) {
  throw new Error('COOKIE_SECURE=true is required when COOKIE_SAME_SITE=none');
}

module.exports = parsed.data;
