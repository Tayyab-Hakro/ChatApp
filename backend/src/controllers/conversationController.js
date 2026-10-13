const conversationService = require('../services/conversationService');
const messageService = require('../services/messageService');

async function create(req, res) {
  const conversation = await conversationService.createConversation(req.user._id, req.body);
  res.status(201).json({ conversation });
}

async function list(req, res) {
  res.json({ conversations: await conversationService.listConversations(req.user._id) });
}

async function get(req, res) {
  res.json({ conversation: await conversationService.getConversation(req.params.conversationId, req.user._id) });
}

async function listMessages(req, res) {
  const messages = await messageService.listMessages(req.params.conversationId, req.user._id, req.query);
  res.json({ messages });
}

async function createMessage(req, res) {
  const message = await messageService.createMessage(
    req.params.conversationId,
    req.user._id,
    req.body
  );
  req.app.get('io')?.to(`conversation:${req.params.conversationId}`).emit('message:new', message);
  res.status(201).json({ message });
}

async function editMessage(req, res) {
  const message = await messageService.editMessage(req.params.messageId, req.user._id, req.body.text);
  req.app.get('io')?.to(`conversation:${message.conversation}`).emit('message:updated', message);
  res.json({ message });
}

async function deleteMessage(req, res) {
  const message = await messageService.deleteMessage(req.params.messageId, req.user._id);
  req.app.get('io')?.to(`conversation:${message.conversation}`).emit('message:deleted', message);
  res.json({ message });
}

async function markRead(req, res) {
  const result = await messageService.markRead(
    req.params.conversationId,
    req.user._id,
    req.body.messageId
  );
  req.app.get('io')?.to(`conversation:${req.params.conversationId}`).emit('conversation:read', result);
  res.json({ success: true });
}

module.exports = { create, list, get, listMessages, createMessage, editMessage, deleteMessage, markRead };
