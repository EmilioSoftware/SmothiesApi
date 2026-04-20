import { Router } from 'express';

import { realtimeHub } from '../realtime/realtime';
import { asyncHandler } from '../shared/async-handler';
import { HttpError } from '../shared/http-error';
import { requireClientId } from '../shared/middlewares/client-id.middleware';
import { asObject } from '../shared/validation';
import { getCart, setCart } from './cart.service';

export const cartRouter = Router();

cartRouter.get(
  '/cart',
  requireClientId,
  asyncHandler(async (request, response) => {
    response.json({ data: await getCart(request.clientId ?? '') });
  })
);

cartRouter.put(
  '/cart',
  requireClientId,
  asyncHandler(async (request, response) => {
    const body = asObject(request.body);

    if (!Array.isArray(body.items)) {
      throw new HttpError(400, 'items debe ser una lista.');
    }

    const cart = await setCart(request.clientId ?? '', body.items);
    realtimeHub.emitCartUpdated(request.clientId ?? '');
    response.json({ data: cart });
  })
);
