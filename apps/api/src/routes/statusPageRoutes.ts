import { Router } from "express";
import { statusPageController } from "../controllers/statusPageController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { StatusPageConfigSchema } from "@pingboard/shared";

const router = Router();

// Private status page configuration endpoints
router.use(authenticate);

router.get("/", (req, res, next) => statusPageController.getSettings(req, res, next));
router.put(
  "/",
  validate({ body: StatusPageConfigSchema }),
  (req, res, next) => statusPageController.updateSettings(req, res, next)
);

export default router;
