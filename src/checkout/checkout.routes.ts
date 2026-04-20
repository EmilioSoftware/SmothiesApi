import { Router } from 'express';

import { checkoutCart } from '../orders/orders.service';
import { realtimeHub } from '../realtime/realtime';
import { asyncHandler } from '../shared/async-handler';
import { requireClientId } from '../shared/middlewares/client-id.middleware';

export const checkoutRouter = Router();

checkoutRouter.post(
  '/checkout',
  requireClientId,
  asyncHandler(async (request, response) => {
    const order = await checkoutCart(request.clientId ?? '', request.body);
    realtimeHub.emitCartUpdated(request.clientId ?? '');
    realtimeHub.emitOrderCreated(order);
    response.status(201).json({ data: order });
  })
);
