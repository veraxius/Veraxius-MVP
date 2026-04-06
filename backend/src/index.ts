import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { ensureUsersTable } from "./config/pg";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import conversationsRouter from "./routes/conversations";
import usersRouter from "./routes/users";
import aimRouter from "./routes/aim";
import { prisma } from "./config/prisma";

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/users", usersRouter);
app.use("/api/aim", aimRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL, credentials: true }
});

// Socket auth middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing token"));
    const secret = process.env.JWT_SECRET;
    if (!secret) return next(new Error("JWT secret not configured"));
    const payload = jwt.verify(token, secret) as any;
    (socket as any).userId = payload.sub as string;
    next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Socket auth error:", err);
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = (socket as any).userId as string;
  // eslint-disable-next-line no-console
  console.log("Socket connected:", userId, socket.id);

  socket.on("join_conversations", async () => {
    try {
      const parts = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true }
      });
      for (const p of parts) {
        socket.join(p.conversationId);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("join_conversations error:", err);
    }
  });

  socket.on("send_message", async (payload: { conversationId: string; content: string }) => {
    try {
      const { conversationId, content } = payload;
      const part = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId }
      });
      if (!part) return; // silently ignore or emit error

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          content
        }
      });
      io.to(conversationId).emit("new_message", message);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("send_message error:", err);
    }
  });

  socket.on("typing", (conversationId: string) => {
    socket.to(conversationId).emit("typing", { conversationId, userId });
  });

  socket.on("stop_typing", (conversationId: string) => {
    socket.to(conversationId).emit("stop_typing", { conversationId, userId });
  });

  socket.on("mark_read", async (conversationId: string) => {
    try {
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: (socket as any).userId }
        },
        data: { status: "read" }
      });
      io.to(conversationId).emit("messages_read", { conversationId, userId });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("mark_read error:", err);
    }
  });
});

// Ensure users table exists before starting the server, then start httpServer
ensureUsersTable().finally(() => {
  httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${PORT}`);
  });
});
