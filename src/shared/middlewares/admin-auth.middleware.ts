import { NextFunction, Request, Response } from 'express';

import { env } from '../../config/env';
import { HttpError } from '../http-error';

export function requireAdminToken(request: Request, _response: Response, next: NextFunction): void {
  const token = request.header('X-Admin-Token');

  if (!token || token !== env.adminApiKey) {
    next(new HttpError(401, 'Admin token invalido o ausente.'));
    return;
  }

  next();
}

export function isValidAdminToken(token: unknown): boolean {
  return typeof token === 'string' && token === env.adminApiKey;
}
