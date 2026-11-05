import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { statusPageService } from "../services/statusPageService";

export class StatusPageController {
  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const settings = await statusPageService.getSettings(userId);
      res.status(200).json({ data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const email = req.user!.email;
      const updated = await statusPageService.updateSettings(userId, email, req.body);
      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const statusPageController = new StatusPageController();
