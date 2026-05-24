import { Router } from 'express';
import { asyncHandler } from '../shared/async-handler.js';
import { requireAuthenticatedUser } from '../shared/middlewares/admin-auth.middleware.js';
import { requireClientId } from '../shared/middlewares/client-id.middleware.js';
import { getSessionDtoByClientId, loginUserSession, logoutUserSession } from './auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/auth/login',
  requireClientId,
  asyncHandler(async (request, response) => {
    response.json({
      data: await loginUserSession(request.clientId ?? '', request.body)
    });
  })
);

authRouter.get(
  '/auth/session',
  requireAuthenticatedUser,
  asyncHandler(async (request, response) => {
    response.json({
      data: request.user ?? (await getSessionDtoByClientId(request.clientId ?? ''))
    });
  })
);

authRouter.post(
  '/auth/logout',
  requireClientId,
  asyncHandler(async (request, response) => {
    await logoutUserSession(request.clientId ?? '');
    response.status(204).send();
  })
);
