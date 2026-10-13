const multer = require('multer');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function notFound(req, _res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} was not found`, 'NOT_FOUND'));
}

function errorHandler(error, req, res, _next) {
  let statusCode = error.statusCode || error.status || 500;
  let code = error.code || 'INTERNAL_SERVER_ERROR';
  let message = error.message || 'An unexpected error occurred';

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Data validation failed';
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = 'Invalid identifier';
  } else if (error.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    message = 'A resource with that value already exists';
  } else if (error instanceof multer.MulterError) {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = 'UPLOAD_ERROR';
    message = error.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file exceeds the size limit' : 'Upload was rejected';
  }

  if (statusCode >= 500) {
    code = 'INTERNAL_SERVER_ERROR';
    message = 'An unexpected error occurred';
  }
  if (statusCode >= 500) {
    logger.error({ err: error, method: req.method, path: req.originalUrl }, 'Request failed');
  }
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(error.details ? { details: error.details } : {})
    },
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 ? { stack: error.stack } : {})
  });
}

module.exports = { notFound, errorHandler };
