import http from "http";
// Aadya Institute Management Server
import app from "./app";
export { app };
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { initWebSocketServer } from "./websocket/ws.server";
import { registerWorkers } from "./workers/register";
import { startCronJobs } from "./jobs/scheduler";

const startServer = async () => {
  await connectDatabase();

  const server = http.createServer(app);
  initWebSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`💬 Chat WebSocket available at ws://localhost:${env.PORT}/ws/chat`);
  });

  if (env.RUN_WORKERS) {
    registerWorkers().catch((err) => {
      console.warn("⚠️ Background workers failed to register:", err?.message || err);
    });
    try {
      startCronJobs();
    } catch (err: any) {
      console.warn("⚠️ Cron scheduler failed to start:", err?.message || err);
    }
  }
};

// Server initialized with updated PostgreSQL Prisma schema
startServer();

