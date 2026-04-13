import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { setupRealtimeGateway } from "./modules/realtime/realtime.gateway.js";
import { logger } from "./observability/logger.js";

const app = createApp();
const server = createServer(app);

setupRealtimeGateway(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "Call AI Agent backend running");
});
