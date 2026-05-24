import { Router } from 'express';
import { realtimeHub } from '../realtime/realtime.js';
import { asyncHandler } from '../shared/async-handler.js';
import { requireAdminToken } from '../shared/middlewares/admin-auth.middleware.js';
import { createSmoothie, deleteSmoothie, listSmoothies, parseCatalogQuery, toggleActive, toggleFavorite, togglePopular, updateSmoothie } from './smoothies.service.js';
export const smoothiesRouter = Router();
smoothiesRouter.get('/smoothies', asyncHandler(async (request, response) => {
    response.json({ data: await listSmoothies(parseCatalogQuery(request.query)) });
}));
smoothiesRouter.patch('/smoothies/:id/favorite', asyncHandler(async (request, response) => {
    const smoothie = await toggleFavorite(request.params.id);
    realtimeHub.emitCatalogUpdated();
    response.json({ data: smoothie });
}));
smoothiesRouter.post('/admin/smoothies', requireAdminToken, asyncHandler(async (request, response) => {
    const smoothie = await createSmoothie(request.body);
    realtimeHub.emitCatalogUpdated();
    response.status(201).json({ data: smoothie });
}));
smoothiesRouter.put('/admin/smoothies/:id', requireAdminToken, asyncHandler(async (request, response) => {
    const smoothie = await updateSmoothie(request.params.id, request.body);
    realtimeHub.emitCatalogUpdated();
    response.json({ data: smoothie });
}));
smoothiesRouter.delete('/admin/smoothies/:id', requireAdminToken, asyncHandler(async (request, response) => {
    await deleteSmoothie(request.params.id);
    realtimeHub.emitCatalogUpdated();
    realtimeHub.emitAllCartsUpdated();
    response.status(204).send();
}));
smoothiesRouter.patch('/admin/smoothies/:id/popular', requireAdminToken, asyncHandler(async (request, response) => {
    const smoothie = await togglePopular(request.params.id);
    realtimeHub.emitCatalogUpdated();
    response.json({ data: smoothie });
}));
smoothiesRouter.patch('/admin/smoothies/:id/active', requireAdminToken, asyncHandler(async (request, response) => {
    const smoothie = await toggleActive(request.params.id);
    realtimeHub.emitCatalogUpdated();
    realtimeHub.emitAllCartsUpdated();
    response.json({ data: smoothie });
}));
