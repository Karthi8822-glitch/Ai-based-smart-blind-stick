import { Request, Response } from 'express';
import { dataService } from '../services/dataService';

export const alertController = {
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = (req.query.deviceId as string) || 'SBS-001';
      const limit = Number(req.query.limit) || 10;
      const alerts = await dataService.getAlerts(deviceId, limit);
      res.status(200).json({ success: true, count: alerts.length, data: alerts });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async postAlert(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, type, severity, message } = req.body;

      if (!type || !message) {
        res.status(400).json({ success: false, message: 'type and message are required.' });
        return;
      }

      const alert = await dataService.addAlert({
        deviceId: deviceId || 'SBS-001',
        type,
        severity: severity || 'warning',
        message,
      });

      res.status(201).json({ success: true, message: 'Alert queued.', data: alert });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
