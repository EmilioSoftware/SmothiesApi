import { createServer } from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './database/mongodb.js';
import { realtimeHub } from './realtime/realtime.js';
import { ensureSmoothieSeed } from './smoothies/smoothies.service.js';
async function bootstrap() {
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
