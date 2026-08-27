import http from "http";
// Aadya Institute Management Server
import app from "./app";
export { app };
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { initWebSocketServer } from "./websocket/ws.server";

const startServer = async () => {
  await connectDatabase();

  const server = http.createServer(app);
  initWebSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`💬 Chat WebSocket available at ws://localhost:${env.PORT}/ws/chat`);
  });
};

// Server started with PostgreSQL connection on port 5432
startServer();
