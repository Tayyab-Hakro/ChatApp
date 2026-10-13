const path = require('path');
const env = require('../config/env');

let adapter;
if (env.UPLOAD_STORAGE_ADAPTER === 'local') {
  adapter = require('./localAdapter');
} else {
  const adapterPath = path.resolve(process.cwd(), env.UPLOAD_STORAGE_ADAPTER);
  adapter = require(adapterPath);
  if (!adapter || typeof adapter.putObject !== 'function' || typeof adapter.getObject !== 'function') {
    throw new Error('A custom upload storage adapter must export putObject(buffer, metadata) and getObject({ key }) functions');
  }
}

module.exports = adapter;
