# Smothies API

Express + JavaScript + MongoDB + Socket.IO backend for SmothiesApp.

## Setup

1. Copy `.env.example` to `.env`.
2. Put your online MongoDB cluster URI in `MONGODB_URI`.
3. Install dependencies and run:

```bash
npm install
npm run dev
```

The API runs at `http://localhost:3000/api` by default. Socket.IO runs on the same HTTP server.

`.env` is ignored by Git, so your local secrets will not be pushed to GitHub.

## Deploy on Vercel

1. Push this repository to GitHub.
2. Import the GitHub repository into Vercel.
3. Add these environment variables in the Vercel project settings:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `CORS_ORIGIN`
   - `SOCKET_CORS_ORIGIN`
4. For an APK built with a WebView or Capacitor, set both CORS variables to:

```bash
http://localhost,http://localhost:4200,http://localhost:8100
```

5. Deploy and verify `GET /api/health`.

Example Vercel values:

```bash
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/?appName=smothies
MONGODB_DB_NAME=smothies
CORS_ORIGIN=http://localhost,http://localhost:4200,http://localhost:8100
SOCKET_CORS_ORIGIN=http://localhost,http://localhost:4200,http://localhost:8100
```

The Vercel deployment uses a serverless entrypoint in [api/index.js](api/index.js) and lazy-initializes MongoDB on cold starts.

Socket.IO is not hosted as a persistent WebSocket server on Vercel Functions. The HTTP API can run on Vercel, but realtime chat/admin updates need a separate realtime provider or a non-serverless Node host.
