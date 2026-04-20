import { NextFunction, Request, Response } from 'express';

import { HttpError } from '../http-error';

declare global {
  namespace Express {
    interface Request {
      clientId?: string;
    }
  }
}

export function requireClientId(request: Request, _response: Response, next: NextFunction): void {
  const clientId = request.header('X-Client-Id');

  if (!clientId || clientId.trim().length < 8) {
    next(new HttpError(400, 'X-Client-Id es requerido.'));
    return;
  }

  request.clientId = clientId.trim();
  next();
}
