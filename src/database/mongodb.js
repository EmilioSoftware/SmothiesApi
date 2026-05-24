import { MongoClient } from 'mongodb';

import { ensureUserIndexes } from '../auth/auth.model.js';
import { ensureCartIndexes } from '../cart/cart.model.js';
import { env } from '../config/env.js';
import { ensureChatThreadIndexes } from '../chat/chat.model.js';
import { ensureOrderIndexes } from '../orders/order.model.js';
import { ensureSmoothieIndexes } from '../smoothies/smoothie.model.js';

let client;
let database;
let connectionPromise;
let currentStatus = 'disconnected';

export async function connectDatabase() {
  if (database) {
    return database;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  currentStatus = 'connecting';
  connectionPromise = (async () => {
    const nextClient = new MongoClient(env.mongodbUri, {
      // Prefer IPv4 in this environment to avoid Atlas connection issues during server selection.
      family: 4,
      serverSelectionTimeoutMS: 15000
    });

    try {
      await nextClient.connect();

      const nextDatabase = nextClient.db(env.mongodbDbName);
      await ensureDatabaseIndexes(nextDatabase);

      client = nextClient;
      database = nextDatabase;
      currentStatus = 'connected';

      return database;
    } catch (error) {
      currentStatus = 'disconnected';
      await nextClient.close().catch(() => undefined);
      throw error;
    } finally {
      connectionPromise = undefined;
    }
  })();

  return connectionPromise;
}

export function getDatabase() {
  if (!database) {
    throw new Error('Database not connected.');
  }

  return database;
}

export function databaseStatus() {
  return currentStatus;
}

export async function closeDatabase() {
  if (!client) {
    currentStatus = 'disconnected';
    database = undefined;
    return;
  }

  currentStatus = 'disconnecting';

  const activeClient = client;
  client = undefined;
  database = undefined;

  try {
    await activeClient.close();
  } finally {
    currentStatus = 'disconnected';
  }
}

export function unwrapDocument(result) {
  if (!result) {
    return null;
  }

  if (typeof result === 'object' && 'value' in result) {
    return result.value ?? null;
  }

  return result;
}

async function ensureDatabaseIndexes(db) {
  await Promise.all([
    ensureUserIndexes(db),
    ensureSmoothieIndexes(db),
    ensureCartIndexes(db),
    ensureOrderIndexes(db),
    ensureChatThreadIndexes(db)
  ]);
}
