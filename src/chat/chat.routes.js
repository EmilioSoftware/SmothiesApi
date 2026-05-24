import { Router } from 'express';
import { asyncHandler } from '../shared/async-handler.js';
import { requireAdminToken, requireAuthenticatedUser } from '../shared/middlewares/admin-auth.middleware.js';
import { getClientThread, listAdminThreads } from './chat.service.js';
export const chatRouter = Router();
chatRouter.get('/chat/thread', requireAuthenticatedUser, asyncHandler(async (request, response) => {
    const orderId = typeof request.query.orderId === 'string' ? request.query.orderId : undefined;
    response.json({ data: await getClientThread(request.clientId ?? '', orderId) });
}));
chatRouter.get('/admin/chat/threads', requireAdminToken, asyncHandler(async (_request, response) => {
    response.json({ data: await listAdminThreads() });
}));
