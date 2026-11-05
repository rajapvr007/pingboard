import { Router } from "express";
import { publicController } from "../controllers/publicController";

const router = Router();

// Publicly accessible status page endpoint (no auth required)
router.get("/status/:slug", (req, res, next) => publicController.getStatusPage(req, res, next));

export default router;
