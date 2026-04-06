import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma";

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = RegisterSchema;

function signToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET not set");
  }
  return jwt.sign({ sub: userId }, secret, { expiresIn: "15d" });
}

router.post("/register", async (req, res) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: { email, password: hashed },
      select: { id: true, email: true, created_at: true },
    });

    const token = signToken(user.id);
    return res.status(201).json({ token, user });
  } catch (err: any) {
    // eslint-disable-next-line no-console
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

    const token = signToken(user.id);
    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, created_at: user.created_at },
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Login error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

export default router;
