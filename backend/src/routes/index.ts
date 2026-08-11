import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import instituteRoutes from "../modules/institutes/institute.routes";
import userRoutes from "../modules/users/user.routes";
import branchRoutes from "../modules/branches/branch.routes";
import { whatsappWebhookVerify, whatsappWebhookHandler } from "../webhooks/whatsapp/whatsapp.webhook";
import { aiCallingCallbackHandler } from "../webhooks/ai-calling/ai-calling.webhook";

const router = Router();

// Auth
router.use("/auth", authRoutes);

// Institutes
router.use("/institutes", instituteRoutes);

// Users
router.use("/users", userRoutes);

// Branches
router.use("/branches", branchRoutes);



// Webhooks (no auth — raw JSON)
router.get("/webhooks/whatsapp", whatsappWebhookVerify);
router.post("/webhooks/whatsapp", whatsappWebhookHandler);
router.post("/webhooks/ai-calling/callback", aiCallingCallbackHandler);

export default router;
