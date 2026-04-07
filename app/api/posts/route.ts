import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getAuth } from "@/lib/auth";

export async function GET() {
	try {
		const resp = await fetch(`${API_URL}/api/posts`, { cache: "no-store" });
		const data = await resp.json();
		return NextResponse.json(data, { status: resp.status });
	} catch {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const auth = getAuth();
		const resp = await fetch(`${API_URL}/api/posts`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: auth?.token ? `Bearer ${auth.token}` : ""
			},
			credentials: "include",
			body: JSON.stringify(body)
		});
		const data = await resp.json();
		return NextResponse.json(data, { status: resp.status });
	} catch {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

