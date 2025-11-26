import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { RoomStore } from "./roomStore";
import { setupSocketHandlers } from "./socketHandler";
import { connectDB } from "../db";
import authRouter from "./auth";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

export function createServer(externalServer?: http.Server) {
  connectDB();
  const app = express();
  const server = externalServer || http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: CORS_ORIGIN,
      methods: ["GET", "POST"],
    },
  });

  // Middleware
  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Auth Routes
  app.use("/api/auth", authRouter);


  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Initialize room store (Redis if REDIS_URL set)
  const store = new RoomStore(process.env.REDIS_URL, {
    ttlSeconds: Number(process.env.ROOM_TTL_SECONDS || 3600),
  });

  // Socket.io connection handler
  io.on("connection", (socket) => {
    console.log("socket connected", socket.id);
    try {
      setupSocketHandlers(io, socket, store);
    } catch (err) {
      console.error("socket handler error", err);
    }
  });

  return { app, server, io, store };
}
