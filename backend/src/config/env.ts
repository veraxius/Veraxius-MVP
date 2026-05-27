/**
 * Fail fast if required environment variables are missing.
 * Import this module immediately after dotenv/config in the entrypoint.
 */
const REQUIRED_ENV: { key: string; hint?: string }[] = [
	{ key: "DATABASE_URL" },
	{ key: "JWT_SECRET" },
	{
		key: "GOOGLE_CLIENT_ID",
		hint: "OAuth 2.0 Web client ID from https://console.cloud.google.com/apis/credentials",
	},
];

for (const { key, hint } of REQUIRED_ENV) {
	if (!process.env[key]?.trim()) {
		// eslint-disable-next-line no-console
		console.error(`Missing required environment variable: ${key}${hint ? ` (${hint})` : ""}`);
		process.exit(1);
	}
}
