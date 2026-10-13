const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const conversationParamsSchema = z.object({ conversationId: objectId });
const messageParamsSchema = z.object({ messageId: objectId });

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
});

const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']),
  title: z.string().trim().max(100).optional(),
  participantIds: z.array(objectId).min(1).max(99)
}).superRefine((value, context) => {
  if (value.type === 'group' && !value.title) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['title'], message: 'Group conversations require a title' });
  }
  if (new Set(value.participantIds).size !== value.participantIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['participantIds'], message: 'Participants must be unique' });
  }
  if (value.type === 'direct' && value.participantIds.length !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['participantIds'], message: 'Direct conversations require exactly one other participant' });
  }
});

const attachmentUrl = z.union([
  z.string().url().max(2048),
  z.string().regex(/^\/api\/uploads\/[a-f\d-]{36}(?:\.[a-z\d]{1,12})?$/i)
]);

const createMessageSchema = z.object({
  text: z.string().trim().max(5000).optional().default(''),
  attachments: z.array(z.object({
    url: attachmentUrl,
    name: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(120),
    size: z.number().int().positive()
  })).max(10).optional().default([])
}).refine((value) => value.text.length > 0 || value.attachments.length > 0, {
  message: 'A message must include text or at least one attachment'
});

const updateMessageSchema = z.object({ text: z.string().trim().min(1).max(5000) });
const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(280).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional()
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be provided' });
const userSearchSchema = z.object({ q: z.string().trim().min(2).max(100) });
const readSchema = z.object({ messageId: objectId.optional() });
const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: z.string().datetime().optional()
});

module.exports = {
  objectId,
  conversationParamsSchema,
  messageParamsSchema,
  registerSchema,
  loginSchema,
  createConversationSchema,
  createMessageSchema,
  updateMessageSchema,
  updateProfileSchema,
  userSearchSchema,
  readSchema,
  paginationSchema
};
