const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const env = require('./env');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { createMessage, markRead } = require('../services/messageService');
const { createMessageSchema, objectId } = require('../validators/schemas');

function toSocketError(error, context) {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }
  if (error.name === 'ZodError') {
    return { code: 'VALIDATION_ERROR', message: error.message };
  }
  logger.error({ err: error, context }, 'Socket request failed');
  return { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to complete socket request' };
}

function createSocketServer(httpServer) {
  const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim());
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed'));
      },
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.accessToken;
      if (typeof token !== 'string') throw new AppError(401, 'Access token is required');
      const claims = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        issuer: 'chat-app-api',
        audience: 'chat-app'
      });
      const user = await User.findById(claims.sub).select('_id name');
      if (!user) throw new AppError(401, 'Account no longer exists');
      socket.data.user = user;
      socket.data.tokenExpiresAt = claims.exp * 1000;
      next();
    } catch (error) {
      next(new Error(error instanceof AppError ? error.message : 'Invalid or expired access token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user._id;
    const expiryTimer = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.data.tokenExpiresAt - Date.now())
    );
    expiryTimer.unref();
    socket.join(`user:${userId}`);
    socket.broadcast.emit('presence:online', { userId: userId.toString() });

    socket.on('conversation:join', async (payload = {}, acknowledge = () => {}) => {
      try {
        const parsed = objectId.safeParse(payload.conversationId);
        if (!parsed.success) throw new AppError(400, 'Invalid conversation identifier', 'VALIDATION_ERROR');
        const conversation = await Conversation.exists({
          _id: parsed.data,
          'participants.user': userId
        });
        if (!conversation) throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
        const room = `conversation:${parsed.data}`;
        await socket.join(room);
        acknowledge({ success: true });
      } catch (error) {
        acknowledge({ success: false, error: toSocketError(error, 'conversation:join') });
      }
    });

    socket.on('conversation:leave', (payload = {}) => {
      if (typeof payload.conversationId === 'string' && objectId.safeParse(payload.conversationId).success) {
        socket.leave(`conversation:${payload.conversationId}`);
      }
    });

    socket.on('message:send', async (payload = {}, acknowledge = () => {}) => {
      try {
        const conversationId = objectId.parse(payload.conversationId);
        const content = createMessageSchema.parse(payload.message);
        const message = await createMessage(conversationId, userId, content);
        io.to(`conversation:${conversationId}`).emit('message:new', message);
        acknowledge({ success: true, message });
      } catch (error) {
        const socketError = toSocketError(error, 'message:send');
        acknowledge({
          success: false,
          error: socketError
        });
      }
    });

    socket.on('typing:start', async (payload = {}) => {
      try {
        const conversationId = objectId.parse(payload.conversationId);
        const member = await Conversation.exists({
          _id: conversationId,
          'participants.user': userId
        });
        if (member) socket.to(`conversation:${conversationId}`).emit('typing:update', {
          conversationId,
          user: { id: userId.toString(), name: socket.data.user.name },
          isTyping: true
        });
      } catch (_error) {
        socket.emit('socket:error', toSocketError(_error, 'typing:start'));
      }
    });

    socket.on('typing:stop', async (payload = {}) => {
      try {
        const conversationId = objectId.parse(payload.conversationId);
        const member = await Conversation.exists({
          _id: conversationId,
          'participants.user': userId
        });
        if (member) socket.to(`conversation:${conversationId}`).emit('typing:update', {
          conversationId,
          user: { id: userId.toString(), name: socket.data.user.name },
          isTyping: false
        });
      } catch (_error) {
        socket.emit('socket:error', toSocketError(_error, 'typing:stop'));
      }
    });

    socket.on('conversation:read', async (payload = {}, acknowledge = () => {}) => {
      try {
        const conversationId = objectId.parse(payload.conversationId);
        const result = await markRead(conversationId, userId, payload.messageId);
        io.to(`conversation:${conversationId}`).emit('conversation:read', result);
        acknowledge({ success: true });
      } catch (error) {
        acknowledge({ success: false, error: toSocketError(error, 'conversation:read') });
      }
    });

    socket.on('disconnect', async () => {
      clearTimeout(expiryTimer);
      try {
        const remainingSockets = await io.in(`user:${userId}`).fetchSockets();
        if (remainingSockets.length === 0) {
          await User.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } });
          socket.broadcast.emit('presence:offline', {
            userId: userId.toString(),
            lastSeenAt: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error({ err: error, userId }, 'Unable to update user presence');
      }
    });
  });

  return io;
}

module.exports = { createSocketServer };
