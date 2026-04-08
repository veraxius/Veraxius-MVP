import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ userId: string; domainName: string }> },
) {
	try {
		const { userId, domainName } = await params;
		const resp = await fetch(
			`${API_URL}/api/users/${userId}/domains/${encodeURIComponent(domainName)}`,
			{ cache: "no-store" },
		);
		const data = await resp.json();
		return NextResponse.json(data, { status: resp.status });
	} catch {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
