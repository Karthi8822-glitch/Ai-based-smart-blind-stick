import { Schema, model, Document } from 'mongoose';

export interface IAlert extends Document {
  deviceId: string;
  type: 'vibration' | 'buzzer' | 'emergency_sos' | 'fall_detection' | 'low_battery';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
  timestamp: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    deviceId: { type: String, required: true, uppercase: true, index: true },
    type: {
      type: String,
      enum: ['vibration', 'buzzer', 'emergency_sos', 'fall_detection', 'low_battery'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    message: { type: String, required: true },
    acknowledged: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Alert = model<IAlert>('Alert', AlertSchema);
