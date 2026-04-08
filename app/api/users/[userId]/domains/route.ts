import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const { userId } = await params;
		// Forward Authorization header so the backend can identify the owner
		const authHeader = req.headers.get("authorization") ?? "";
		const resp = await fetch(`${API_URL}/api/users/${userId}/domains`, {
			cache: "no-store",
			headers: authHeader ? { Authorization: authHeader } : {},
		});
		const data = await resp.json();
		return NextResponse.json(data, { status: resp.status });
	} catch {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
