const express = require('express');
const multer = require('multer');
const env = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const controller = require('../controllers/uploadController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_SIZE_BYTES, files: 1 },
  fileFilter(_req, file, callback) {
    if (!controller.allowedTypes.has(file.mimetype)) {
      return callback(new AppError(415, 'File type is not allowed', 'UNSUPPORTED_FILE_TYPE'));
    }
    callback(null, true);
  }
});

const router = express.Router();
router.post('/', requireAuth, upload.single('file'), asyncHandler(controller.upload));
router.get('/:key', requireAuth, asyncHandler(controller.download));

module.exports = router;
