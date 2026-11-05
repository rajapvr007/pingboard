import { Request, Response, NextFunction } from "express";
import { statusPageService } from "../services/statusPageService";

export class PublicController {
  async getStatusPage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.params.slug;
      const statusData = await statusPageService.getPublicStatusPage(slug);
      res.status(200).json({ data: statusData });
    } catch (error) {
      next(error);
    }
  }
}

export const publicController = new PublicController();
