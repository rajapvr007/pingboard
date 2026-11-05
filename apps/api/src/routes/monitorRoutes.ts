import { Router } from "express";
import { monitorController } from "../controllers/monitorController";
import { metricsController } from "../controllers/metricsController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { CreateMonitorSchema, UpdateMonitorSchema, MetricsQuerySchema } from "@pingboard/shared";

const router = Router();

// All monitor routes require Cognito JWT authentication
router.use(authenticate);

router.get("/", (req, res, next) => monitorController.list(req, res, next));
router.post(
  "/",
  validate({ body: CreateMonitorSchema }),
  (req, res, next) => monitorController.create(req, res, next)
);
router.get("/:id", (req, res, next) => monitorController.getById(req, res, next));
router.put(
  "/:id",
  validate({ body: UpdateMonitorSchema }),
  (req, res, next) => monitorController.update(req, res, next)
);
router.delete("/:id", (req, res, next) => monitorController.delete(req, res, next));

// Metrics and Incident routes
router.get(
  "/:id/metrics",
  validate({ query: MetricsQuerySchema }),
  (req, res, next) => metricsController.getMetrics(req, res, next)
);
router.get(
  "/:id/incidents",
  (req, res, next) => metricsController.getIncidents(req, res, next)
);

export default router;
