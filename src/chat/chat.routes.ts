import { Router } from 'express';

import { asyncHandler } from '../shared/async-handler';
import { requireAdminToken } from '../shared/middlewares/admin-auth.middleware';
import { requireClientId } from '../shared/middlewares/client-id.middleware';
import { getClientThread, listAdminThreads } from './chat.service';

export const chatRouter = Router();

chatRouter.get(
  '/chat/thread',
  requireClientId,
  asyncHandler(async (request, response) => {
    const orderId = typeof request.query.orderId === 'string' ? request.query.orderId : undefined;
    response.json({ data: await getClientThread(request.clientId ?? '', orderId) });
  })
);

chatRouter.get(
  '/admin/chat/threads',
  requireAdminToken,
  asyncHandler(async (_request, response) => {
    response.json({ data: await listAdminThreads() });
  })
);
