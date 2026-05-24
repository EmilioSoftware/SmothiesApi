import dotenv from 'dotenv';
dotenv.config();
function readRequired(name, fallback) {
    const value = process.env[name] ?? fallback;
    if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value.trim();
}
function readCsv(name, fallback) {
    return readRequired(name, fallback)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
export const env = {
    port: Number(process.env.PORT ?? 3000),
    mongodbUri: readRequired('MONGODB_URI', 'mongodb+srv://admin:P42DELmLmGec267y@smothies.stfnzbz.mongodb.net/?appName=smothies'),
    mongodbDbName: readRequired('MONGODB_DB_NAME', 'smothies'),
    corsOrigin: readCsv('CORS_ORIGIN', 'http://localhost:4200,http://localhost:8100'),
    socketCorsOrigin: readCsv('SOCKET_CORS_ORIGIN', 'http://localhost:4200,http://localhost:8100')
};
