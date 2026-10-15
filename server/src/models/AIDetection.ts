import { Schema, model, Document } from 'mongoose';

export interface IAIDetection extends Document {
  deviceId: string;
  modelName: string;
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  inferenceTimeMs: number;
  timestamp: Date;
}

const AIDetectionSchema = new Schema<IAIDetection>(
  {
    deviceId: { type: String, required: true, uppercase: true, index: true },
    modelName: { type: String, default: 'tflite_mobilenet_ssd_v2_quant' },
    label: { type: String, required: true },
    confidence: { type: Number, required: true },
    boundingBox: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    inferenceTimeMs: { type: Number, default: 35 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AIDetection = model<IAIDetection>('AIDetection', AIDetectionSchema);
