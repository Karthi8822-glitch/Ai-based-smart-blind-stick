import { Schema, model, Document } from 'mongoose';

export interface ISensorData extends Document {
  deviceId: string;
  distance: number;
  object: string;
  confidence: number;
  latitude: number;
  longitude: number;
  battery: number;
  alert: string;
  timestamp: Date;
}

const SensorDataSchema = new Schema<ISensorData>(
  {
    deviceId: { type: String, required: true, uppercase: true, index: true },
    distance: { type: Number, required: true },
    object: { type: String, required: true },
    confidence: { type: Number, required: true, default: 0.95 },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    battery: { type: Number, required: true, default: 82 },
    alert: { type: String, default: 'none' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const SensorData = model<ISensorData>('SensorData', SensorDataSchema);
