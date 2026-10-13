const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { updateProfileSchema, userSearchSchema } = require('../validators/schemas');
const controller = require('../controllers/userController');

const router = express.Router();
router.use(requireAuth);
router.get('/search', validate(userSearchSchema, 'query'), asyncHandler(controller.search));
router.patch('/me', validate(updateProfileSchema), asyncHandler(controller.updateProfile));

module.exports = router;
