import { NextResponse } from "next/server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // In production, this would save to a database or CRM
    // For now, we just return success
    console.log("Early access request received:", email);

    return NextResponse.json({
      ok: true,
      message: "Request received.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process request.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
