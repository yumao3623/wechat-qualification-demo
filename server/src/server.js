const { createApp } = require('./app');
const { config } = require('./config');

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(
    `Demo Backend 已启动：http://127.0.0.1:${config.port}（Enterprise Provider: ${config.enterpriseProvider}，Auth: ${config.authMode}）`
  );
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
