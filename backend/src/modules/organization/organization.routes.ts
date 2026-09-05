import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { getContext } from "./organization.controller";

const router = Router();

router.use(authMiddleware);

/**
 * Safe organization context for any authenticated portal user.
 * Resolves institute exclusively from JWT / session — never from client input.
 */
router.get("/context", getContext);

export default router;
