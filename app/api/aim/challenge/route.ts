import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const resp = await fetch(`${API_URL}/api/aim/challenge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		});
		const data = await resp.json();
		return NextResponse.json(data, { status: resp.status });
	} catch (err) {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
