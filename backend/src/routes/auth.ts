import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma";

const router = Router();

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";

function signAccessToken(userId: string) {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ sub: userId, type: "access" }, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function signRefreshToken(userId: string) {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ sub: userId, type: "refresh" }, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(80).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/register", async (req, res) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: { email, password: hashed, name },
      select: { id: true, email: true, name: true, created_at: true },
    });

    const access_token = signAccessToken(user.id);
    const refresh_token = signRefreshToken(user.id);

   return res.status(201).json({
  access_token,
  token: access_token,
  refresh_token,
  token_type: "Bearer",
  user,
});
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const access_token = signAccessToken(user.id);
    const refresh_token = signRefreshToken(user.id);

    return res.status(200).json({
  access_token,
  token: access_token,
  refresh_token,
  token_type: "Bearer",
  user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
});

  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.post("/refresh", (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: "Missing refresh token" });
    }

    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(refresh_token, secret) as any;

    if (payload.type !== "refresh") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    const newAccessToken = signAccessToken(payload.sub);

    return res.status(200).json({
  access_token: newAccessToken,
  token: newAccessToken,
  token_type: "Bearer",
});
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || "Invalid refresh token" });
  }
});

router.post("/logout", (_req, res) => {
  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;