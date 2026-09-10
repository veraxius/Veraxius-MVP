import rateLimit from "express-rate-limit";

// MVP5 tenant traffic is legitimate partner-system API calls, not end-user
// login attempts — a higher ceiling than authRateLimiter, still bounded.
export const tenantRateLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 120,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many requests, please try again later" },
});
