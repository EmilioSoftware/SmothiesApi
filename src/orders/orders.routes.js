import { Router } from 'express';
import { realtimeHub } from '../realtime/realtime.js';
import { asyncHandler } from '../shared/async-handler.js';
import { requireAdminToken, requireAuthenticatedUser } from '../shared/middlewares/admin-auth.middleware.js';
import { listAdminOrders, listOrdersByClient, updateOrderStatus } from './orders.service.js';
export const ordersRouter = Router();
ordersRouter.get('/orders', requireAuthenticatedUser, asyncHandler(async (request, response) => {
    response.json({ data: await listOrdersByClient(request.clientId ?? '') });
}));
ordersRouter.get('/admin/orders', requireAdminToken, asyncHandler(async (_request, response) => {
    response.json({ data: await listAdminOrders() });
}));
ordersRouter.patch('/admin/orders/:id/status', requireAdminToken, asyncHandler(async (request, response) => {
    const order = await updateOrderStatus(request.params.id, request.body?.status);
    realtimeHub.emitOrderUpdated(order);
    response.json({ data: order });
}));
