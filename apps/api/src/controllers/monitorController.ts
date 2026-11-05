import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { monitorService } from "../services/monitorService";

export class MonitorController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const monitors = await monitorService.listMonitors(userId);
      res.status(200).json({ data: monitors });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const monitorId = req.params.id;
      const monitor = await monitorService.getMonitor(userId, monitorId);
      res.status(200).json({ data: monitor });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const monitor = await monitorService.createMonitor(userId, req.body);
      res.status(201).json({ data: monitor });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const monitorId = req.params.id;
      const updated = await monitorService.updateMonitor(userId, monitorId, req.body);
      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const monitorId = req.params.id;
      await monitorService.deleteMonitor(userId, monitorId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const monitorController = new MonitorController();
