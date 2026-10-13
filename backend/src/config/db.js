const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

async function connectDatabase(uri = env.MONGODB_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
  return mongoose.connection;
}

module.exports = { connectDatabase };
