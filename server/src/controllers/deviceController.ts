import { Request, Response } from 'express';
import { dataService } from '../services/dataService';

export const deviceController = {
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = (req.query.deviceId as string) || 'SBS-001';
      const device = await dataService.getDevice(deviceId);
      res.status(200).json({ success: true, data: device });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async registerDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, name, emergencyContact, firmwareVersion } = req.body;
      if (!deviceId) {
        res.status(400).json({ success: false, message: 'deviceId is required' });
        return;
      }

      const device = await dataService.registerDevice({
        deviceId,
        name: name || 'NOVOS Smart Blind Cane',
        emergencyContact,
        firmwareVersion: firmwareVersion || 'v2.4.1-ai-edge',
        status: 'online',
      });

      res.status(201).json({ success: true, message: 'Device registered successfully', data: device });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
