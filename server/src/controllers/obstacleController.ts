import { Request, Response } from 'express';
import { dataService } from '../services/dataService';

export const obstacleController = {
  async getObstacles(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = (req.query.deviceId as string) || 'SBS-001';
      const limit = Number(req.query.limit) || 10;
      const obstacles = await dataService.getObstacles(deviceId, limit);
      res.status(200).json({ success: true, count: obstacles.length, data: obstacles });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async postObstacle(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, label, distance, confidence, dangerLevel, boundingBox } = req.body;

      if (!label || distance === undefined) {
        res.status(400).json({ success: false, message: 'label and distance are required.' });
        return;
      }

      const obstacle = await dataService.addObstacle({
        deviceId: deviceId || 'SBS-001',
        label,
        distance: Number(distance),
        confidence: confidence !== undefined ? Number(confidence) : 0.95,
        dangerLevel: dangerLevel || (distance < 1.0 ? 'high' : distance < 1.8 ? 'medium' : 'low'),
        boundingBox,
        detectedAt: new Date(),
      });

      res.status(201).json({ success: true, message: 'Obstacle cataloged.', data: obstacle });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
