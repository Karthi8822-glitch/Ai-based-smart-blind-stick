import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'caregiver' | 'user' | 'researcher' | 'admin';
  assignedDeviceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['caregiver', 'user', 'researcher', 'admin'], 
      default: 'caregiver' 
    },
    assignedDeviceId: { type: String, default: 'SBS-001' },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
