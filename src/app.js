import cors from 'cors';
import express from 'express';
import { authRouter } from './auth/auth.routes.js';
import { cartRouter } from './cart/cart.routes.js';
import { chatRouter } from './chat/chat.routes.js';
import { checkoutRouter } from './checkout/checkout.routes.js';
import { env } from './config/env.js';
import { databaseStatus } from './database/mongodb.js';
import { ordersRouter } from './orders/orders.routes.js';
import { HttpError } from './shared/http-error.js';
import { smoothiesRouter } from './smoothies/smoothies.routes.js';
export function createApp() {
    const app = express();
    app.use(cors({
        origin: env.corsOrigin,
        credentials: true
    }));
    app.use(express.json({ limit: '1mb' }));
    app.get('/api/health', (_request, response) => {
        response.json({
            ok: true,
            database: databaseStatus(),
            timestamp: new Date().toISOString()
        });
    });
    app.use('/api', authRouter);
    app.use('/api', smoothiesRouter);
    app.use('/api', cartRouter);
    app.use('/api', ordersRouter);
    app.use('/api', checkoutRouter);
    app.use('/api', chatRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}
function notFoundHandler(_request, _response, next) {
    next(new HttpError(404, 'Ruta no encontrada.'));
}
function errorHandler(error, _request, response, _next) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    const details = error instanceof HttpError ? error.details : undefined;
    response.status(statusCode).json({
        error: {
            message,
            details
        }
    });
}
