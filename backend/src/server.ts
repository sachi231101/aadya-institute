import app from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

const startServer = async () => {
  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  });
};

// Server started with PostgreSQL on port 5433
startServer();


