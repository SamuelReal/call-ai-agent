import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeRealtimeGateway, setupRealtimeGateway } from "./modules/realtime/realtime.gateway.js";
import { logger } from "./observability/logger.js";
import { closeMySqlPool } from "./db/mysql.js";

const app = createApp();
const server = createServer(app);
const wsGateway = setupRealtimeGateway(server);
let shuttingDown = false;

async function closeHttpServer() {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info({ signal }, "Shutdown signal received, closing services");

  const forceExitTimer = setTimeout(() => {
    logger.error("Forced shutdown timeout reached");
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    await closeRealtimeGateway(wsGateway);
    await closeHttpServer();
    await closeMySqlPool();
    clearTimeout(forceExitTimer);
    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    logger.error({ err: error?.message }, "Graceful shutdown failed");
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "Call AI Agent backend running");
});
