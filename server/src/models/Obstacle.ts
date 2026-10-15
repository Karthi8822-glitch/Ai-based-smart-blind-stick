import { Schema, model, Document } from 'mongoose';

export interface IObstacle extends Document {
  deviceId: string;
  label: string;
  distance: number;
  confidence: number;
  dangerLevel: 'low' | 'medium' | 'high';
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  detectedAt: Date;
}

const ObstacleSchema = new Schema<IObstacle>(
  {
    deviceId: { type: String, required: true, uppercase: true, index: true },
    label: { type: String, required: true },
    distance: { type: Number, required: true },
    confidence: { type: Number, required: true, default: 0.9 },
    dangerLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    boundingBox: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    detectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Obstacle = model<IObstacle>('Obstacle', ObstacleSchema);
