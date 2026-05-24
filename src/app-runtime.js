import { connectDatabase } from './database/mongodb.js';
import { ensureSmoothieSeed } from './smoothies/smoothies.service.js';

let runtimeReadyPromise;

export async function ensureAppRuntime() {
  if (runtimeReadyPromise) {
    return runtimeReadyPromise;
  }

  runtimeReadyPromise = (async () => {
    await connectDatabase();
    await ensureSmoothieSeed();
  })().catch((error) => {
    runtimeReadyPromise = undefined;
    throw error;
  });

  return runtimeReadyPromise;
}
