import { createServer } from 'http';

import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './database/mongoose';
import { realtimeHub } from './realtime/realtime';
import { ensureSmoothieSeed } from './smoothies/smoothies.service';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await ensureSmoothieSeed();

  const app = createApp();
  const server = createServer(app);

  realtimeHub.init(server);

  server.listen(env.port, () => {
    console.log(`Smothies API listening on http://localhost:${env.port}`);
  });
}

void bootstrap().catch((error) => {
  console.error('Could not start Smothies API.', error);
  process.exit(1);
});
