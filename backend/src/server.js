import http from "http";
import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { startExamScheduler, stopExamScheduler } from "./services/exam.scheduler.js";
import { registerSocketHandlers } from "./sockets/socket.server.js";
import { connectRedis, disconnectRedis } from "./shared/redis/redis.client.js";

mongoose.set("strictQuery", true);

const app = createApp();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.allowAllCorsOrigins ? "*" : config.corsOrigins,
    credentials: true
  }
});

registerSocketHandlers(io);

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    await connectRedis();
    startExamScheduler(io);

    server.listen(config.port, () => {
      console.log(`API + Socket server running on ${config.port}`);
    });
  } catch (error) {
    console.error("Mongo connection failed", error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  stopExamScheduler();

  await disconnectRedis().catch(console.error);
  await mongoose.disconnect().catch(console.error);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch(console.error);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch(console.error);
});

start().catch(console.error);
