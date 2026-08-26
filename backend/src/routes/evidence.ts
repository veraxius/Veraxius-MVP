import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { invalidPayload, internalError } from "../lib/validation";

const router = Router();

router.use(requireAuth);

const ALLOWED_EVIDENCE_MIME = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
]);
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024; // 10MB, matches the Challenge mockup's stated limit

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const evidenceUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_EVIDENCE_SIZE },
	fileFilter: (_req, file, cb) => {
		if (ALLOWED_EVIDENCE_MIME.has(file.mimetype)) {
			cb(null, true);
			return;
		}
		cb(new Error("Invalid file type"));
	},
});

function uploadEvidenceToCloudinary(buffer: Buffer, fileName: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: "veraxius/evidence",
				resource_type: "auto", // lets Cloudinary store PDFs/Office docs, not just images
				filename_override: fileName,
				use_filename: true,
			},
			(error, result) => {
				if (error) {
					reject(error);
					return;
				}
				if (!result?.secure_url) {
					reject(new Error("Upload failed"));
					return;
				}
				resolve(result.secure_url);
			},
		);

		Readable.from(buffer).pipe(uploadStream);
	});
}

function handleEvidenceUpload(
	req: import("express").Request,
	res: import("express").Response,
	next: import("express").NextFunction,
) {
	evidenceUpload.single("file")(req, res, (err: unknown) => {
		if (err instanceof multer.MulterError) {
			if (err.code === "LIMIT_FILE_SIZE") {
				return res.status(400).json({ error: "File too large (max 10MB)" });
			}
			return res.status(400).json({ error: "Upload failed" });
		}
		if (err) {
			return res.status(400).json({ error: "Invalid file type" });
		}
		return next();
	});
}

const LinkFieldsSchema = z
	.object({
		aimEventId: z.string().uuid().optional(),
		domainAimEventId: z.string().uuid().optional(),
		challengeId: z.string().uuid().optional(),
	})
	.refine(
		(data) => Boolean(data.aimEventId || data.domainAimEventId || data.challengeId),
		{ message: "One of aimEventId, domainAimEventId, or challengeId is required" },
	);

router.post("/", handleEvidenceUpload, async (req, res) => {
	try {
		const parsed = LinkFieldsSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);

		const userId = req.userId as string;
		const { aimEventId, domainAimEventId, challengeId } = parsed.data;

		if (!req.file) {
			return res.status(400).json({ error: "No file provided" });
		}

		if (aimEventId) {
			const exists = await prisma.aimEvent.findUnique({ where: { id: aimEventId }, select: { id: true } });
			if (!exists) return res.status(404).json({ error: "AIM event not found" });
		}
		if (domainAimEventId) {
			const exists = await prisma.domainAimEvent.findUnique({ where: { id: domainAimEventId }, select: { id: true } });
			if (!exists) return res.status(404).json({ error: "Domain AIM event not found" });
		}
		if (challengeId) {
			const exists = await prisma.aimChallenge.findUnique({ where: { id: challengeId }, select: { id: true } });
			if (!exists) return res.status(404).json({ error: "Challenge not found" });
		}

		if (
			!process.env.CLOUDINARY_CLOUD_NAME ||
			!process.env.CLOUDINARY_API_KEY ||
			!process.env.CLOUDINARY_API_SECRET
		) {
			return res.status(500).json({ error: "Upload service not configured" });
		}

		const fileUrl = await uploadEvidenceToCloudinary(req.file.buffer, req.file.originalname);

		const evidence = await prisma.evidence.create({
			data: {
				uploadedBy: userId,
				aimEventId: aimEventId ?? null,
				domainAimEventId: domainAimEventId ?? null,
				challengeId: challengeId ?? null,
				fileName: req.file.originalname,
				fileUrl,
				fileType: req.file.mimetype,
				fileSize: req.file.size,
			},
		});

		return res.json(evidence);
	} catch (err) {
		return internalError(res, err, "POST /api/evidence");
	}
});

const ListQuerySchema = z
	.object({
		aimEventId: z.string().uuid().optional(),
		domainAimEventId: z.string().uuid().optional(),
		challengeId: z.string().uuid().optional(),
	})
	.refine(
		(data) => Boolean(data.aimEventId || data.domainAimEventId || data.challengeId),
		{ message: "One of aimEventId, domainAimEventId, or challengeId is required" },
	);

router.get("/", async (req, res) => {
	try {
		const parsed = ListQuerySchema.safeParse(req.query);
		if (!parsed.success) return invalidPayload(res);

		const { aimEventId, domainAimEventId, challengeId } = parsed.data;

		const evidence = await prisma.evidence.findMany({
			where: {
				...(aimEventId ? { aimEventId } : {}),
				...(domainAimEventId ? { domainAimEventId } : {}),
				...(challengeId ? { challengeId } : {}),
			},
			orderBy: { createdAt: "asc" },
		});

		return res.json(evidence);
	} catch (err) {
		return internalError(res, err, "GET /api/evidence");
	}
});

export default router;
