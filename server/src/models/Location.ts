import { Schema, model, Document } from 'mongoose';

export interface ILocation extends Document {
  deviceId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  address?: string;
  timestamp: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    deviceId: { type: String, required: true, uppercase: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    altitude: { type: Number, default: 432 },
    speed: { type: Number, default: 1.1 },
    address: { type: String, default: 'Metropolitan Tech Center, 4th Avenue Way' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Location = model<ILocation>('Location', LocationSchema);
