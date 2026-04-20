import { Router } from 'express';

import { realtimeHub } from '../realtime/realtime';
import { asyncHandler } from '../shared/async-handler';
import { requireAdminToken } from '../shared/middlewares/admin-auth.middleware';
import { requireClientId } from '../shared/middlewares/client-id.middleware';
import { listAdminOrders, listOrdersByClient, updateOrderStatus } from './orders.service';

export const ordersRouter = Router();

ordersRouter.get(
  '/orders',
  requireClientId,
  asyncHandler(async (request, response) => {
    response.json({ data: await listOrdersByClient(request.clientId ?? '') });
  })
);

ordersRouter.get(
  '/admin/orders',
  requireAdminToken,
  asyncHandler(async (_request, response) => {
    response.json({ data: await listAdminOrders() });
  })
);

ordersRouter.patch(
  '/admin/orders/:id/status',
  requireAdminToken,
  asyncHandler(async (request, response) => {
    const order = await updateOrderStatus(request.params.id, request.body?.status);
    realtimeHub.emitOrderUpdated(order);
    response.json({ data: order });
  })
);
