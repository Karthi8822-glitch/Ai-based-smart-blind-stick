import { Schema, model, Document } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;
  name: string;
  status: 'online' | 'offline' | 'standby';
  firmwareVersion: string;
  lastSeen: Date;
  batteryLevel: number;
  ownerId?: string;
  emergencyContact?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, default: 'NOVOS Vision Cane' },
    status: { type: String, enum: ['online', 'offline', 'standby'], default: 'online' },
    firmwareVersion: { type: String, default: 'v2.4.1-ai-edge' },
    lastSeen: { type: Date, default: Date.now },
    batteryLevel: { type: Number, default: 82, min: 0, max: 100 },
    ownerId: { type: String },
    emergencyContact: { type: String, default: '+1 (555) 019-2834' },
  },
  { timestamps: true }
);

export const Device = model<IDevice>('Device', DeviceSchema);
