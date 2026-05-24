import { Router } from 'express';
import { realtimeHub } from '../realtime/realtime.js';
import { asyncHandler } from '../shared/async-handler.js';
import { requireAuthenticatedUser } from '../shared/middlewares/admin-auth.middleware.js';
import { HttpError } from '../shared/http-error.js';
import { asObject } from '../shared/validation.js';
import { getCart, setCart } from './cart.service.js';
export const cartRouter = Router();
cartRouter.get('/cart', requireAuthenticatedUser, asyncHandler(async (request, response) => {
    response.json({ data: await getCart(request.clientId ?? '') });
}));
cartRouter.put('/cart', requireAuthenticatedUser, asyncHandler(async (request, response) => {
    const body = asObject(request.body);
    if (!Array.isArray(body.items)) {
        throw new HttpError(400, 'items debe ser una lista.');
    }
    const cart = await setCart(request.clientId ?? '', body.items);
    realtimeHub.emitCartUpdated(request.clientId ?? '');
    response.json({ data: cart });
}));
