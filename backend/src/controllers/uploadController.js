const crypto = require('crypto');
const path = require('path');
const storage = require('../storage');
const AppError = require('../utils/AppError');
const Upload = require('../models/Upload');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain'
]);

function safeExtension(originalName) {
  const extension = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return extension.slice(0, 12);
}

async function upload(req, res) {
  if (!req.file) throw new AppError(400, 'A file is required', 'FILE_REQUIRED');
  if (!allowedTypes.has(req.file.mimetype)) {
    throw new AppError(415, 'File type is not allowed', 'UNSUPPORTED_FILE_TYPE');
  }
  const filename = `${crypto.randomUUID()}${safeExtension(req.file.originalname)}`;
  await storage.putObject(req.file.buffer, {
    filename,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
    userId: req.user.id
  });
  const url = `/api/uploads/${encodeURIComponent(filename)}`;
  await Upload.create({
    key: filename,
    owner: req.user._id,
    name: req.file.originalname.slice(0, 255),
    mimeType: req.file.mimetype,
    size: req.file.size
  });
  res.status(201).json({
    file: {
      url,
      name: req.file.originalname.slice(0, 255),
      mimeType: req.file.mimetype,
      size: req.file.size
    }
  });
}

async function download(req, res) {
  const upload = await Upload.findOne({ key: req.params.key });
  if (!upload) throw new AppError(404, 'File not found', 'FILE_NOT_FOUND');

  let authorized = upload.owner.equals(req.user._id);
  if (!authorized) {
    const isAvatar = await User.exists({ avatarUrl: `/api/uploads/${encodeURIComponent(upload.key)}` });
    if (isAvatar) {
      authorized = true;
    } else {
      const message = await Message.findOne({
        'attachments.url': `/api/uploads/${encodeURIComponent(upload.key)}`
      }).select('conversation');
      if (message) {
        authorized = Boolean(await Conversation.exists({
          _id: message.conversation,
          'participants.user': req.user._id
        }));
      }
    }
  }
  if (!authorized) throw new AppError(403, 'You do not have access to this file', 'FORBIDDEN');

  const buffer = await storage.getObject({ key: upload.key });
  res.set({
    'Content-Type': upload.mimeType,
    'Content-Length': buffer.length,
    'Content-Disposition': `attachment; filename="${encodeURIComponent(upload.name)}"`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox"
  });
  res.send(buffer);
}

module.exports = { upload, download, allowedTypes };
