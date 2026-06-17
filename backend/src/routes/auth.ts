import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { authRateLimiter } from "../middleware/rateLimit";
import { zEmail, zPassword, zName, zIdToken, invalidPayload, internalError } from "../lib/validation";

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";
const PASSWORD_RESET_GENERIC_MESSAGE =
  "If that email exists, a reset link has been sent";

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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

const ForgotPasswordSchema = z.object({
  email: zEmail,
});

const ResetPasswordSchema = z.object({
  email: zEmail,
  token: z.string().min(1).max(128),
  newPassword: zPassword,
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

router.post("/forgot-password", authRateLimiter, async (req, res) => {
  try {
    const parsed = ForgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalidPayload(res);
    }

    const { email } = parsed.data;

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        const rawToken = randomBytes(32).toString("hex");
        const resetToken = hashResetToken(rawToken);
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken, resetTokenExpiry },
        });

        const frontendUrl = process.env.FRONTEND_URL!;
        const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

        await resend.emails.send({
          from: "Veraxius <noreply@veraxius.com>",
          to: email,
          subject: "Reset your Veraxius password",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111;">
              <h2 style="margin:0 0 12px 0;">Reset your password</h2>
              <p>We received a request to reset your Veraxius password. Click the link below to choose a new one:</p>
              <p><a href="${resetLink}" style="color: #d97706;">Reset password</a></p>
              <p style="opacity: 0.7; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      }
    } catch (err) {
      console.error("Forgot password error:", err);
    }

    return res.status(200).json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(200).json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
  }
});

router.post("/reset-password", authRateLimiter, async (req, res) => {
  try {
    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalidPayload(res);
    }

    const { email, token, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user?.resetToken ||
      !user.resetTokenExpiry ||
      user.resetTokenExpiry < new Date() ||
      user.resetToken !== hashResetToken(token)
    ) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    const saltRounds = 10;
    const hashed = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    return internalError(res, err, "Reset password error:");
  }
});

export default router;
