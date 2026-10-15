import { Request, Response } from 'express';
import { dataService } from '../services/dataService';

export const dashboardController = {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = (req.query.deviceId as string) || 'SBS-001';
      const summary = await dataService.getDashboardSummary(deviceId);
      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
