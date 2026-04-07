import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getAuth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const body = await req.json();
		const auth = getAuth();
		const resp = await fetch(`${API_URL}/api/posts/${id}/comments`, {
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

