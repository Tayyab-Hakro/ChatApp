const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const { requireMembership } = require('./conversationService');

async function createMessage(conversationId, senderId, content) {
  const conversation = await requireMembership(conversationId, senderId);
  const message = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    text: content.text,
    attachments: content.attachments,
    readBy: [senderId]
  });
  conversation.lastMessage = message._id;
  conversation.updatedAt = new Date();
  await conversation.save();
  return Message.findById(message._id).populate('sender', 'name avatarUrl');
}

async function listMessages(conversationId, userId, { limit, before }) {
  await requireMembership(conversationId, userId);
  const query = { conversation: conversationId };
  if (before) query.createdAt = { $lt: new Date(before) };
  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'name avatarUrl');
  return messages.reverse();
}

async function editMessage(messageId, userId, text) {
  const message = await Message.findById(messageId);
  if (!message || message.deletedAt) throw new AppError(404, 'Message not found', 'MESSAGE_NOT_FOUND');
  if (!message.sender.equals(userId)) throw new AppError(403, 'Only the sender can edit this message', 'FORBIDDEN');
  message.text = text;
  message.editedAt = new Date();
  await message.save();
  return message.populate('sender', 'name avatarUrl');
}

async function deleteMessage(messageId, userId) {
  const message = await Message.findById(messageId);
  if (!message || message.deletedAt) throw new AppError(404, 'Message not found', 'MESSAGE_NOT_FOUND');
  const conversation = await requireMembership(message.conversation, userId);
  const member = conversation.participants.find((participant) => participant.user.equals(userId));
  if (!message.sender.equals(userId) && member.role !== 'admin') {
    throw new AppError(403, 'Only the sender or a conversation admin can delete this message', 'FORBIDDEN');
  }
  message.text = '';
  message.attachments = [];
  message.deletedAt = new Date();
  await message.save();
  return message.populate('sender', 'name avatarUrl');
}

async function markRead(conversationId, userId, messageId) {
  await requireMembership(conversationId, userId);
  let cutoff;
  if (messageId) {
    cutoff = await Message.findOne({ _id: messageId, conversation: conversationId }).select('createdAt');
    if (!cutoff) throw new AppError(404, 'Message not found in this conversation', 'MESSAGE_NOT_FOUND');
  }
  const query = { conversation: conversationId, readBy: { $ne: userId } };
  if (cutoff) query.createdAt = { $lte: cutoff.createdAt };
  await Message.updateMany(query, { $addToSet: { readBy: userId } });
  await Conversation.updateOne(
    { _id: conversationId, 'participants.user': userId },
    { $set: { 'participants.$.lastReadAt': cutoff ? cutoff.createdAt : new Date() } }
  );
  return { conversationId, userId, messageId: messageId || null };
}

module.exports = { createMessage, listMessages, editMessage, deleteMessage, markRead };
