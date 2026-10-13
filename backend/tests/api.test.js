process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const request = require('supertest');
const { io: connectSocket } = require('socket.io-client');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { connectDatabase } = require('../src/config/db');
const { createSocketServer } = require('../src/config/socket');
const storage = require('../src/storage');

let mongo;
let httpServer;
let ioServer;
let socketUrl;
let firstAgent;
let secondAgent;
let firstUser;
let secondUser;
let firstToken;
let secondToken;
let originalRefreshCookie;
let activeSockets = [];
let generatedFiles = [];

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  httpServer = http.createServer(app);
  ioServer = createSocketServer(httpServer);
  app.set('io', ioServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  socketUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

beforeEach(async () => {
  activeSockets = [];
  generatedFiles = [];
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));

  firstAgent = request.agent(app);
  secondAgent = request.agent(app);
  const first = await firstAgent.post('/api/auth/register').send({
    name: 'Test Person',
    email: 'first@example.com',
    password: 'a-strong-password-123'
  });
  firstUser = first.body.user;
  firstToken = first.body.accessToken;
  originalRefreshCookie = first.headers['set-cookie'][0].split(';')[0];

  const second = await secondAgent.post('/api/auth/register').send({
    name: 'Second Person',
    email: 'second@example.com',
    password: 'a-strong-password-456'
  });
  secondUser = second.body.user;
  secondToken = second.body.accessToken;
});

afterEach(async () => {
  activeSockets.forEach((socket) => socket.disconnect());
  await Promise.all(generatedFiles.map((key) => fs.rm(path.join(storage.uploadDirectory, key), { force: true })));
});

afterAll(async () => {
  await new Promise((resolve) => ioServer.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

function openSocket(accessToken) {
  return new Promise((resolve, reject) => {
    const socket = connectSocket(socketUrl, {
      auth: { accessToken },
      reconnection: false,
      timeout: 5000
    });
    activeSockets.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

describe('authentication', () => {
  it('stores only a password hash and authenticates protected requests', async () => {
    expect(firstUser.password).toBeUndefined();
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${firstToken}`);
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('first@example.com');
  });

  it('rejects invalid registration and unauthenticated requests', async () => {
    const invalid = await request(app).post('/api/auth/register').send({
      name: 'X',
      email: 'not-an-email',
      password: 'short'
    });
    const unauthenticated = await request(app).get('/api/conversations');

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    expect(unauthenticated.status).toBe(401);
  });

  it('rotates a refresh token and rejects reuse', async () => {
    expect(originalRefreshCookie).toContain('chat_refresh=');

    const refresh = await firstAgent.post('/api/auth/refresh');
    expect(refresh.status).toBe(200);
    expect(refresh.body.accessToken).toBeTruthy();

    const replay = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', originalRefreshCookie);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('REFRESH_TOKEN_REUSE');
  });
});

describe('conversations and messages', () => {
  it('creates a direct conversation and delivers messages only to participants', async () => {
    const created = await firstAgent
      .post('/api/conversations')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ type: 'direct', participantIds: [secondUser.id] });
    expect(created.status).toBe(201);
    const conversationId = created.body.conversation._id;

    const sent = await firstAgent
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ text: 'Hello there' });
    expect(sent.status).toBe(201);
    expect(sent.body.message.text).toBe('Hello there');

    const received = await secondAgent
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${secondToken}`);
    expect(received.status).toBe(200);
    expect(received.body.messages).toHaveLength(1);

    const forbidden = await secondAgent
      .patch(`/api/conversations/messages/${sent.body.message._id}`)
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ text: 'Changed by someone else' });
    expect(forbidden.status).toBe(403);
  });

  it('rejects non-members even when conversation and message IDs are valid', async () => {
    const created = await firstAgent
      .post('/api/conversations')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ type: 'direct', participantIds: [secondUser.id] });
    const third = await request(app).post('/api/auth/register').send({
      name: 'Third Person',
      email: 'third@example.com',
      password: 'a-strong-password-789'
    });
    const response = await request(app)
      .get(`/api/conversations/${created.body.conversation._id}`)
      .set('Authorization', `Bearer ${third.body.accessToken}`);
    expect(response.status).toBe(403);
  });

  it('authenticates sockets, checks conversation membership, and delivers live messages', async () => {
    const created = await firstAgent
      .post('/api/conversations')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ type: 'direct', participantIds: [secondUser.id] });
    const conversationId = created.body.conversation._id;
    const firstSocket = await openSocket(firstToken);
    const secondSocket = await openSocket(secondToken);
    const third = await request(app).post('/api/auth/register').send({
      name: 'Third Person',
      email: 'third-socket@example.com',
      password: 'a-strong-password-789'
    });
    const outsiderSocket = await openSocket(third.body.accessToken);

    const firstJoin = await new Promise((resolve) => {
      firstSocket.emit('conversation:join', { conversationId }, resolve);
    });
    const secondJoin = await new Promise((resolve) => {
      secondSocket.emit('conversation:join', { conversationId }, resolve);
    });
    expect(firstJoin.success).toBe(true);
    expect(secondJoin.success).toBe(true);
    const outsiderJoin = await new Promise((resolve) => {
      outsiderSocket.emit('conversation:join', { conversationId }, resolve);
    });
    expect(outsiderJoin.success).toBe(false);
    expect(outsiderJoin.error.code).toBe('CONVERSATION_NOT_FOUND');

    const delivered = new Promise((resolve) => secondSocket.once('message:new', resolve));
    const sent = await new Promise((resolve) => {
      firstSocket.emit('message:send', {
        conversationId,
        message: { text: 'Live delivery' }
      }, resolve);
    });
    expect(sent.success).toBe(true);
    await expect(delivered).resolves.toMatchObject({ text: 'Live delivery' });
  });

  it('restricts uploaded file downloads until shared with a conversation member', async () => {
    const conversation = await firstAgent
      .post('/api/conversations')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ type: 'direct', participantIds: [secondUser.id] });
    const uploaded = await firstAgent
      .post('/api/uploads')
      .set('Authorization', `Bearer ${firstToken}`)
      .attach('file', Buffer.from('private note'), { filename: 'note.txt', contentType: 'text/plain' });
    if (uploaded.body.file?.url) generatedFiles.push(decodeURIComponent(uploaded.body.file.url.split('/').pop()));
    expect(uploaded.status).toBe(201);

    const fileKey = decodeURIComponent(uploaded.body.file.url.split('/').pop());
    const ownerDownload = await firstAgent
      .get(`/api/uploads/${fileKey}`)
      .set('Authorization', `Bearer ${firstToken}`);
    expect(ownerDownload.status).toBe(200);
    expect(ownerDownload.text).toBe('private note');

    const denied = await secondAgent
      .get(`/api/uploads/${fileKey}`)
      .set('Authorization', `Bearer ${secondToken}`);
    expect(denied.status).toBe(403);

    const shared = await firstAgent
      .post(`/api/conversations/${conversation.body.conversation._id}/messages`)
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ attachments: [uploaded.body.file] });
    expect(shared.status).toBe(201);

    const participantDownload = await secondAgent
      .get(`/api/uploads/${fileKey}`)
      .set('Authorization', `Bearer ${secondToken}`);
    expect(participantDownload.status).toBe(200);
    expect(participantDownload.text).toBe('private note');
  });
});
