import { NextResponse } from "next/server";

type ContactPayload = {
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  message?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload;
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const company = (body.company || "").trim();
    const role = (body.role || "").trim();
    const message = (body.message || "").trim();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Valid email is required." },
        { status: 400 }
      );
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service not configured." },
        { status: 500 }
      );
    }

    // Build email content
    const subject = `New contact from ${name || email}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2 style="margin:0 0 12px 0;">New Contact Request</h2>
        <table cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <tr><td style="opacity:.7;">Name</td><td><strong>${escapeHtml(name) || "—"}</strong></td></tr>
          <tr><td style="opacity:.7;">Email</td><td><strong>${escapeHtml(email)}</strong></td></tr>
          <tr><td style="opacity:.7;">Company</td><td>${escapeHtml(company) || "—"}</td></tr>
          <tr><td style="opacity:.7;">Role</td><td>${escapeHtml(role) || "—"}</td></tr>
        </table>
        <div style="margin-top:16px;">
          <div style="opacity:.7; margin-bottom:6px;">Message</div>
          <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${escapeHtml(message) || "—"}</pre>
        </div>
      </div>
    `;

    // Send via Resend HTTP API (no SDK dependency)
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Veraxius <onboarding@resend.dev>",
        to: ["beta@veraxius.com"],
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const err = await safeJson(resp);
      return NextResponse.json(
        { error: "Failed to send email", details: err },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, message: "Sent" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function safeJson(resp: Response) {
  try {
    return await resp.json();
  } catch {
    return { status: resp.status, statusText: resp.statusText };
  }
}

