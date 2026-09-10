// Human-readable object IDs (TRS §4) are a presentation-layer convenience —
// the database stores plain UUIDs. withPrefix()/stripPrefix() convert
// between the two so the API can speak "DEC_<uuid>" while every internal
// query still uses the raw id.

export const PREFIX = {
	entity: "ENT",
	claim: "CLM",
	evidence: "EVD",
	signal: "SIG",
	decision: "DEC",
	trustState: "TRS",
	authority: "AUT",
	action: "ACT",
	outcome: "OUT",
	context: "CTX",
	policy: "POL",
	governanceEvent: "GOV",
	contradiction: "CTD",
	humanApproval: "APR",
} as const;

export function withPrefix(prefix: string, id: string): string {
	return `${prefix}_${id}`;
}

export function stripPrefix(value: string): string {
	const idx = value.indexOf("_");
	return idx === -1 ? value : value.slice(idx + 1);
}
