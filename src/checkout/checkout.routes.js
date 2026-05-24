import { Router } from 'express';
import { checkoutCart } from '../orders/orders.service.js';
import { realtimeHub } from '../realtime/realtime.js';
import { asyncHandler } from '../shared/async-handler.js';
import { requireAuthenticatedUser } from '../shared/middlewares/admin-auth.middleware.js';
export const checkoutRouter = Router();
checkoutRouter.post('/checkout', requireAuthenticatedUser, asyncHandler(async (request, response) => {
    const { order, thread } = await checkoutCart(request.clientId ?? '', {
        ...request.body,
        customerName: request.user?.name,
        customerPhone: request.user?.phone
    });
    realtimeHub.emitCartUpdated(request.clientId ?? '');
    realtimeHub.emitOrderCreated(order);
    if (thread) {
        realtimeHub.emitChatThreadUpdated(thread);
    }
    response.status(201).json({ data: order });
}));
