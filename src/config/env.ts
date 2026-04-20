import dotenv from 'dotenv';

dotenv.config();

function readRequired(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function readCsv(name: string, fallback: string): string[] {
  return readRequired(name, fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: readRequired('MONGODB_URI', 'mongodb://127.0.0.1:27017/smothiesapp'),
  mongodbDbName: readRequired('MONGODB_DB_NAME', 'smothiesapp'),
  corsOrigin: readCsv('CORS_ORIGIN', 'http://localhost:4200,http://localhost:8100'),
  socketCorsOrigin: readCsv('SOCKET_CORS_ORIGIN', 'http://localhost:4200,http://localhost:8100'),
  adminApiKey: readRequired('ADMIN_API_KEY', 'change-me-admin-token')
};
