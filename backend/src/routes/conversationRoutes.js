const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  createConversationSchema,
  createMessageSchema,
  updateMessageSchema,
  readSchema,
  paginationSchema,
  conversationParamsSchema,
  messageParamsSchema
} = require('../validators/schemas');
const controller = require('../controllers/conversationController');

const router = express.Router();
router.use(requireAuth);
router.post('/', validate(createConversationSchema), asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.get('/:conversationId', validate(conversationParamsSchema, 'params'), asyncHandler(controller.get));
router.get('/:conversationId/messages', validate(conversationParamsSchema, 'params'), validate(paginationSchema, 'query'), asyncHandler(controller.listMessages));
router.post('/:conversationId/messages', validate(conversationParamsSchema, 'params'), validate(createMessageSchema), asyncHandler(controller.createMessage));
router.post('/:conversationId/read', validate(conversationParamsSchema, 'params'), validate(readSchema), asyncHandler(controller.markRead));
router.patch('/messages/:messageId', validate(messageParamsSchema, 'params'), validate(updateMessageSchema), asyncHandler(controller.editMessage));
router.delete('/messages/:messageId', validate(messageParamsSchema, 'params'), asyncHandler(controller.deleteMessage));

module.exports = router;
