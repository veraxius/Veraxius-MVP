import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { authRateLimiter } from "../middleware/rateLimit";
import { zEmail, zPassword, zName, zIdToken, invalidPayload, internalError } from "../lib/validation";

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

const userSelect = { id: true, email: true, name: true, created_at: true } as const;

function buildAuthResponse(user: {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
}) {
  const access_token = signAccessToken(user.id);
  const refresh_token = signRefreshToken(user.id);
  return {
    access_token,
    token: access_token,
    refresh_token,
    token_type: "Bearer" as const,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    },
  };
}

const RegisterSchema = z.object({
  email: zEmail,
  password: zPassword,
  name: zName.optional(),
});

const LoginSchema = z.object({
  email: zEmail,
  password: zPassword,
});

const GoogleSchema = z.object({
  id_token: zIdToken,
});

const RefreshSchema = z.object({
  refresh_token: z.string().min(1).max(2048),
});

router.post("/register", authRateLimiter, async (req, res) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalidPayload(res);
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
      select: userSelect,
    });

    return res.status(201).json(buildAuthResponse(user));
  } catch (err) {
    return internalError(res, err, "Register error:");
  }
});

router.post("/login", authRateLimiter, async (req, res) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalidPayload(res);
    }
    const { email, password } = parsed.data;

    const userRecord = await prisma.user.findUnique({ where: { email } });
    if (!userRecord) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, userRecord.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      created_at: userRecord.created_at,
    };
    return res.status(200).json(buildAuthResponse(user));
  } catch (err) {
    return internalError(res, err, "Login error:");
  }
});

router.post("/google", authRateLimiter, async (req, res) => {
  try {
    const parsed = GoogleSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalidPayload(res);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google sign-in is not configured" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.id_token,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      return res.status(401).json({ error: "Invalid Google token" });
    }
    if (payload.email_verified === false) {
      return res.status(401).json({ error: "Google email not verified" });
    }

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name ?? payload.given_name ?? null;

    let user = await prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, googleId: true },
    });

    if (user) {
      if (!user.googleId) {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          select: userSelect,
        });
        return res.status(200).json(buildAuthResponse(updated));
      }
      const { googleId: _gid, ...publicUser } = user;
      return res.status(200).json(buildAuthResponse(publicUser));
    } else {
      const hashed = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
      const created = await prisma.user.create({
        data: { email, name, password: hashed, googleId },
        select: userSelect,
      });
      return res.status(201).json(buildAuthResponse(created));
    }
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(401).json({ error: "Invalid Google token" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const parsed = RefreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalidPayload(res);
    }

    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(parsed.data.refresh_token, secret) as { sub?: string; type?: string };

    if (payload.type !== "refresh" || !payload.sub) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const newAccessToken = signAccessToken(payload.sub);

    return res.status(200).json({
      access_token: newAccessToken,
      token: newAccessToken,
      token_type: "Bearer",
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", (_req, res) => {
  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
