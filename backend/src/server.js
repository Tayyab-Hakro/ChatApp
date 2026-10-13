const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/db');
const { createSocketServer } = require('./config/socket');
const logger = require('./utils/logger');

async function start() {
  await connectDatabase();
  const server = http.createServer(app);
  const io = createSocketServer(server);
  app.set('io', io);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Chat API listening');
  });

  const shutdown = (signal) => {
    logger.info({ signal }, 'Shutting down');
    io.close(() => {
      server.close(() => process.exit(0));
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch((error) => {
  logger.fatal({ err: error }, 'Unable to start Chat API');
  process.exitCode = 1;
});
