import { Router } from "express";
import authRoutes from "./authRoutes";
import monitorRoutes from "./monitorRoutes";
import statusPageRoutes from "./statusPageRoutes";
import publicRoutes from "./publicRoutes";

const router = Router();

// Health check endpoint for ALB / ECS / App Runner target group
router.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Mount module routers
router.use("/auth", authRoutes);
router.use("/monitors", monitorRoutes);
router.use("/status-page", statusPageRoutes);
router.use("/public", publicRoutes);

export default router;
