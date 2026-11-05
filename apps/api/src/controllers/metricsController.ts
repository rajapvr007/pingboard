import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { metricsService } from "../services/metricsService";
import { monitorService } from "../services/monitorService";

export class MetricsController {
  async getMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const monitorId = req.params.id;
      const range = (req.query.range as "24h" | "7d" | "30d") || "24h";

      // Verify monitor ownership
      await monitorService.getMonitor(userId, monitorId);

      const metrics = await metricsService.getMetrics(monitorId, range);
      res.status(200).json({ data: metrics });
    } catch (error) {
      next(error);
    }
  }

  async getIncidents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const monitorId = req.params.id;

      // Verify monitor ownership
      await monitorService.getMonitor(userId, monitorId);

      const incidents = await metricsService.getIncidents(monitorId);
      res.status(200).json({ data: incidents });
    } catch (error) {
      next(error);
    }
  }
}

export const metricsController = new MetricsController();
