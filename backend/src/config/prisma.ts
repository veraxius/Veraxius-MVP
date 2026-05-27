import { PrismaClient } from "@prisma/client";

const QUERY_TIMEOUT_MS = 10_000;

export const prisma = new PrismaClient().$extends({
	query: {
		async $allOperations({ args, query }) {
			return Promise.race([
				query(args),
				new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error("Database query timeout")), QUERY_TIMEOUT_MS);
				}),
			]);
		},
	},
});
