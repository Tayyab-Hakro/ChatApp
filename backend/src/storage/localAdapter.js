const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');

const uploadDirectory = path.resolve(__dirname, '..', '..', env.UPLOAD_DIR);

async function putObject(buffer, { filename, mimeType }) {
  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadDirectory, filename), buffer, { flag: 'wx' });
  return { url: `/uploads/${encodeURIComponent(filename)}`, mimeType };
}

async function getObject({ key }) {
  return fs.readFile(path.join(uploadDirectory, path.basename(key)));
}

module.exports = { putObject, getObject, uploadDirectory };
