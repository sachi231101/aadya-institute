/**
 * PM2 ecosystem — Hostinger / production
 *
 * API listens on 5000 and 5001 (matches deploy/nginx/aadya.conf upstream).
 * Workers run in a separate process so BullMQ jobs never block HTTP.
 */
module.exports = {
  apps: [
    {
      name: "aadya-api",
      cwd: "./backend",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        RUN_WORKERS: "false",
        PEAK_MODE: "false",
      },
      max_memory_restart: "600M",
      kill_timeout: 8000,
    },
    {
      name: "aadya-api-2",
      cwd: "./backend",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
        RUN_WORKERS: "false",
        PEAK_MODE: "false",
      },
      max_memory_restart: "600M",
      kill_timeout: 8000,
    },
    {
      name: "aadya-worker",
      cwd: "./backend",
      script: "dist/workers/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        RUN_WORKERS: "true",
        PEAK_MODE: "false",
        WHATSAPP_QUEUE_CONCURRENCY: "5",
      },
      max_memory_restart: "512M",
      kill_timeout: 15000,
    },
  ],
};
