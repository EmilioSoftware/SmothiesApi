import { createServer } from 'http';
import app from './app.js';
import { ensureAppRuntime } from './app-runtime.js';
import { env } from './config/env.js';
import { realtimeHub } from './realtime/realtime.js';
async function bootstrap() {
    await ensureAppRuntime();
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
