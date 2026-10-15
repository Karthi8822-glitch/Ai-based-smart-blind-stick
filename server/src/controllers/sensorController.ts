import { Request, Response } from 'express';
import { dataService } from '../services/dataService';

export const sensorController = {
  async getLatest(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = (req.query.deviceId as string) || 'SBS-001';
      const data = await dataService.getLatestSensorData(deviceId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async postData(req: Request, res: Response): Promise<void> {
    try {
      const {
        deviceId,
        distance,
        object,
        confidence,
        latitude,
        longitude,
        battery,
        alert,
        timestamp,
      } = req.body;

      if (distance === undefined || !object) {
        res.status(400).json({
          success: false,
          message: 'Invalid payload: distance and object fields are required.',
        });
        return;
      }

      const saved = await dataService.saveSensorData({
        deviceId: deviceId || 'SBS-001',
        distance: Number(distance),
        object,
        confidence: confidence !== undefined ? Number(confidence) : 0.95,
        latitude: latitude !== undefined ? Number(latitude) : 11.0168,
        longitude: longitude !== undefined ? Number(longitude) : 76.9558,
        battery: battery !== undefined ? Number(battery) : 82,
        alert: alert || 'none',
        timestamp: timestamp || new Date(),
      });

      res.status(201).json({
        success: true,
        message: 'Sensor data recorded successfully.',
        data: saved,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
