import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import instituteRoutes from "../modules/institutes/institute.routes";
import leadRoutes from "../modules/leads/lead.routes";
import facultyRoutes from "../modules/faculty/faculty.routes";
import { whatsappWebhookVerify, whatsappWebhookHandler } from "../webhooks/whatsapp/whatsapp.webhook";
import { sarvamWebhookHandler } from "../webhooks/ai-calling/ai-calling.webhook";

const router = Router();

// Auth
router.use("/auth", authRoutes);

// Institutes
router.use("/institutes", instituteRoutes);

// Leads + AI Calling (Phase 1)
router.use("/leads", leadRoutes);

// Faculty
router.use("/faculty", facultyRoutes);

// Webhooks (no auth — must be publicly accessible)
router.get("/webhooks/whatsapp", whatsappWebhookVerify);
router.post("/webhooks/whatsapp", whatsappWebhookHandler);
router.post("/webhooks/sarvam/callback", sarvamWebhookHandler);

export default router;

