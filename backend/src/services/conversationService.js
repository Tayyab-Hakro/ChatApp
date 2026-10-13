const Conversation = require('../models/Conversation');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { MAX_GROUP_PARTICIPANTS } = require('../constants');

function hasParticipant(conversation, userId) {
  return conversation.participants.some((participant) => participant.user.equals(userId));
}

async function createConversation(currentUserId, { type, title = '', participantIds }) {
  const members = [...new Set([currentUserId.toString(), ...participantIds])];
  if (type === 'direct' && members.length !== 2) {
    throw new AppError(400, 'A direct conversation requires one other participant', 'INVALID_PARTICIPANTS');
  }
  if (members.length > MAX_GROUP_PARTICIPANTS) {
    throw new AppError(400, 'A conversation cannot exceed 100 participants', 'PARTICIPANT_LIMIT');
  }
  const users = await User.find({ _id: { $in: members } }).select('_id');
  if (users.length !== members.length) throw new AppError(404, 'One or more participants were not found', 'USER_NOT_FOUND');

  if (type === 'direct') {
    const directKey = members.map(String).sort().join(':');
    const existing = await Conversation.findOne({ type: 'direct', directKey })
      .populate('participants.user', 'name email avatarUrl lastSeenAt')
      .populate('lastMessage');
    if (existing) return existing;
    try {
      const created = await Conversation.create({
        type,
        directKey,
        participants: members.map((user) => ({ user, role: user === currentUserId.toString() ? 'admin' : 'member' }))
      });
      return created.populate('participants.user', 'name email avatarUrl lastSeenAt');
    } catch (error) {
      if (error.code !== 11000) throw error;
      const concurrent = await Conversation.findOne({ type: 'direct', directKey })
        .populate('participants.user', 'name email avatarUrl lastSeenAt')
        .populate('lastMessage');
      if (!concurrent) throw error;
      return concurrent;
    }
  }

  return Conversation.create({
    type,
    title,
    participants: members.map((user) => ({ user, role: user === currentUserId.toString() ? 'admin' : 'member' }))
  });
}

async function listConversations(userId) {
  return Conversation.find({ 'participants.user': userId })
    .sort({ updatedAt: -1 })
    .populate('participants.user', 'name email avatarUrl lastSeenAt')
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name avatarUrl' } });
}

async function getConversation(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId)
    .populate('participants.user', 'name email avatarUrl lastSeenAt')
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name avatarUrl' } });
  if (!conversation) throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
  if (!hasParticipant(conversation, userId)) throw new AppError(403, 'You are not a member of this conversation', 'FORBIDDEN');
  return conversation;
}

async function requireMembership(conversationId, userId) {
  const conversation = await Conversation.findOne({ _id: conversationId, 'participants.user': userId });
  if (!conversation) throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
  return conversation;
}

module.exports = { createConversation, listConversations, getConversation, requireMembership };
