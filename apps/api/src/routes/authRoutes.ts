import { Router } from "express";
import * as authController from "../controllers/authController";

const router = Router();

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/confirm", authController.confirm);
router.post("/resend-code", authController.resendCode);

export default router;
