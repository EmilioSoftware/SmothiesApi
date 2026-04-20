import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';

import { cartRouter } from './cart/cart.routes';
import { chatRouter } from './chat/chat.routes';
import { checkoutRouter } from './checkout/checkout.routes';
import { env } from './config/env';
import { databaseStatus } from './database/mongoose';
import { ordersRouter } from './orders/orders.routes';
import { HttpError } from './shared/http-error';
import { smoothiesRouter } from './smoothies/smoothies.routes';

export function createApp(): express.Express {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({
      ok: true,
      database: databaseStatus(),
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api', smoothiesRouter);
  app.use('/api', cartRouter);
  app.use('/api', ordersRouter);
  app.use('/api', checkoutRouter);
  app.use('/api', chatRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function notFoundHandler(_request: Request, _response: Response, next: NextFunction): void {
  next(new HttpError(404, 'Ruta no encontrada.'));
}

function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
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
