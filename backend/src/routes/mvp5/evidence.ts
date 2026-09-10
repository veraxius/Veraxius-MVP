import { createHash } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireTenant } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";
import { withPrefix, stripPrefix, PREFIX } from "../../lib/aimMvp5/ids";

const router = Router();
router.use(requireTenant);

/**
 * POST /api/evidence — Directive §8: "Evidence exists or arrives" is step 1
 * of the required implementation chain, and Evidence "may include: documents,
 * observations, records, API responses, attestations, verified claims,
 * machine events, transaction results, human verification, policy results,
 * historical behavior, contradictions, outcomes." Every one of those can
 * come from OUTSIDE the platform — this is the ingestion point for that.
 * (The outcome loop in routes/mvp5/outcomes.ts generates its own Evidence
 * automatically; this endpoint is for everything that doesn't originate
 * from an MVP5 Outcome.)
 */
const CreateEvidenceSchema = z.object({
	evidence_type: z.enum([
		"document",
		"observation",
		"api_response",
		"attestation",
		"verified_claim",
		"machine_event",
		"human_verification",
		"policy_result",
		"historical_behavior",
	]),
	content: z.record(z.any()),
	provenance: z.record(z.any()).optional(),
	claim_id: z.string().min(1).optional(),
	decision_id: z.string().min(1).optional(),
	observed_at: z.string().datetime().optional(),
});

router.post("/", async (req, res) => {
	try {
		const parsed = CreateEvidenceSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const d = parsed.data;

		const contentHash = createHash("sha256").update(JSON.stringify(d.content)).digest("hex");

		const evidence = await prisma.evidence.create({
			data: {
				tenantId,
				uploadedBy: null, // externally-submitted evidence has no Veraxius member uploader
				fileName: `${d.evidence_type}-${Date.now()}`,
				fileUrl: "",
				fileType: "application/json",
				fileSize: 0,
				status: "validated",
				evidenceType: d.evidence_type,
				content: d.content,
				provenance: d.provenance,
				observedAt: d.observed_at ? new Date(d.observed_at) : new Date(),
				claimId: d.claim_id ? stripPrefix(d.claim_id) : undefined,
				decisionId: d.decision_id ? stripPrefix(d.decision_id) : undefined,
				contentHash,
				hashAlgorithm: "sha256",
				canonicalizationVersion: "1",
			},
		});

		return res.status(201).json({ evidence_id: withPrefix(PREFIX.evidence, evidence.id), content_hash: contentHash });
	} catch (err) {
		return internalError(res, err, "POST /api/evidence");
	}
});

router.get("/", async (req, res) => {
	try {
		const tenantId = req.tenantId as string;
		const evidence = await prisma.evidence.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 });
		return res.json(
			evidence.map((e) => ({
				evidence_id: withPrefix(PREFIX.evidence, e.id),
				evidence_type: e.evidenceType,
				content: e.content,
				content_hash: e.contentHash,
				observed_at: e.observedAt,
				created_at: e.createdAt,
			})),
		);
	} catch (err) {
		return internalError(res, err, "GET /api/evidence");
	}
});

export default router;
