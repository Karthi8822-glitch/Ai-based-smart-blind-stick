import { Request, Response } from 'express';
import { dataService } from '../services/dataService';

export const locationController = {
  async getLatestLocation(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = (req.query.deviceId as string) || 'SBS-001';
      const location = await dataService.getLatestLocation(deviceId);
      res.status(200).json({ success: true, data: location });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, latitude, longitude, altitude, speed, address } = req.body;

      if (latitude === undefined || longitude === undefined) {
        res.status(400).json({ success: false, message: 'latitude and longitude are required.' });
        return;
      }

      const updated = await dataService.updateLocation({
        deviceId: deviceId || 'SBS-001',
        latitude: Number(latitude),
        longitude: Number(longitude),
        altitude: altitude !== undefined ? Number(altitude) : 432,
        speed: speed !== undefined ? Number(speed) : 1.1,
        address,
      });

      res.status(201).json({ success: true, message: 'GPS coordinates recorded.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
