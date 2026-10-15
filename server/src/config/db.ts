import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async (): Promise<boolean> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-blind-stick';

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000, // Quick 3s timeout so it doesn't hang if offline
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${uri}`);
    return true;
  } catch (error: unknown) {
    isConnected = false;
    console.warn(`[MongoDB Notice] Local MongoDB daemon not reachable at ${uri}.`);
    console.warn(`[MongoDB Notice] The server will seamlessly use the in-memory resilient service layer for live telemetry & demo data.`);
    console.warn(`[MongoDB Notice] To use real MongoDB, start mongod or set MONGODB_URI in server/.env (e.g. MongoDB Atlas).`);
    return false;
  }
};

export const isDbConnected = (): boolean => isConnected;
