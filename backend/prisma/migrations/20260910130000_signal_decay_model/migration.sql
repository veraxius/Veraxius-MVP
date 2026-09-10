-- Signal decay support (TRS Directive §20 — exponential half-life). Additive,
-- nullable; existing Signal rows are unaffected (no decay beyond expiresAt).
ALTER TABLE "Signal" ADD COLUMN     "decayModel" TEXT,
ADD COLUMN     "halfLifeDays" DOUBLE PRECISION;
