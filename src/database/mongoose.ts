import mongoose from 'mongoose';

import { env } from '../config/env';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName
  });
}

export function databaseStatus(): string {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}
