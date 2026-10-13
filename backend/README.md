# Chat application backend

CommonJS Express API backed by MongoDB, with JWT access tokens, rotating refresh-token cookies, Socket.IO messaging/presence, validated uploads, and Vitest/Supertest API tests.

## Requirements and setup

- Node.js 20+
- MongoDB 6+

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Set `JWT_ACCESS_SECRET` to a unique random value of at least 32 characters before deployment. In production, set `COOKIE_SECURE=true`, use HTTPS, and configure `CLIENT_ORIGIN` to the frontend origin(s); multiple origins may be comma-separated. MongoDB should use authentication and TLS in production.

## Frontend

The React client is in `../frontend`. It defaults to the API and Socket.IO server at `http://localhost:5000`, matching this backend's default port. From the frontend directory, copy `.env.example` to `.env`, run `npm install`, then `npm run dev`. If the API is hosted elsewhere, update `VITE_API_URL` (the `/api` base path) and `VITE_SOCKET_URL` in the frontend environment file. Set `CLIENT_ORIGIN` here to the frontend's origin when it differs from `http://localhost:5173`.

## API overview

All routes are prefixed by `/api`. Protected HTTP routes require `Authorization: Bearer <accessToken>`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/auth/register`, `/auth/login` | Create account or start a session |
| POST | `/auth/refresh`, `/auth/logout` | Rotate or revoke the HTTP-only refresh cookie |
| GET | `/auth/me` | Current account |
| GET | `/users/search?q=...` | Search users by name/email |
| PATCH | `/users/me` | Update name or bio |
| GET, POST | `/conversations` | List or create direct/group conversations |
| GET | `/conversations/:id` | Fetch one conversation |
| GET, POST | `/conversations/:id/messages` | Paginate or send messages |
| POST | `/conversations/:id/read` | Mark messages as read |
| PATCH, DELETE | `/conversations/messages/:id` | Edit or soft-delete a message |
| POST | `/uploads` | Upload one file as multipart field `file` |
| GET | `/uploads/:key` | Download an owned file or a file shared in a conversation |

Message history accepts `limit` (1-100) and an ISO-8601 `before` query cursor. Uploads are limited by `UPLOAD_MAX_SIZE_BYTES`; accepted types are JPEG, PNG, WebP, GIF, PDF, and plain text. File downloads require authentication and are limited to the owner, users in a conversation containing the attachment, or public profile avatars. Local storage is the default. Set `UPLOAD_STORAGE_ADAPTER` to a module path exporting `async putObject(buffer, metadata)` and `async getObject({ key }) -> Buffer` to use a cloud provider adapter.

## Socket.IO events

Connect with `auth: { accessToken }`. Authenticated clients may emit:

- `conversation:join` with `{ conversationId }` (membership is checked)
- `conversation:leave` with `{ conversationId }`
- `message:send` with `{ conversationId, message: { text, attachments } }`
- `typing:start` / `typing:stop` with `{ conversationId }`
- `conversation:read` with `{ conversationId, messageId? }`

Server events include `message:new`, `message:updated`, `message:deleted`, `conversation:read`, `typing:update`, `presence:online`, and `presence:offline`. Request/acknowledgement events return `{ success, ... }`; clients should use acknowledgements for send/read/join operations.

## Tests

```powershell
npm test
```

The API tests use `mongodb-memory-server`, so the first run may download a MongoDB test binary.
