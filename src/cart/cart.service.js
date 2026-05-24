import { getDatabase, unwrapDocument } from '../database/mongodb.js';
import { getSmoothiesCollection } from '../smoothies/smoothie.model.js';
import { getCartsCollection } from './cart.model.js';

export async function getCart(clientId) {
    const now = new Date();
    const cart = unwrapDocument(await getCartsCollection(getDatabase()).findOneAndUpdate({ clientId }, {
        $setOnInsert: { clientId, items: [], createdAt: now },
        $set: { updatedAt: now }
    }, { upsert: true, returnDocument: 'after' }));
    return sanitizeCart(cart?.items ?? []);
}
export async function setCart(clientId, items) {
    const activeSmoothieIds = await getActiveSmoothieIds();
    const nextItems = sanitizeCart(Array.isArray(items) ? items : []).filter((item) => activeSmoothieIds.has(item.smoothieId));
    const now = new Date();
    const cart = unwrapDocument(await getCartsCollection(getDatabase()).findOneAndUpdate({ clientId }, {
        $set: { clientId, items: nextItems, updatedAt: now },
        $setOnInsert: { createdAt: now }
    }, { upsert: true, returnDocument: 'after' }));
    return sanitizeCart(cart?.items ?? []);
}
export async function clearCart(clientId) {
    const now = new Date();
    await getCartsCollection(getDatabase()).updateOne({ clientId }, {
        $set: { clientId, items: [], updatedAt: now },
        $setOnInsert: { createdAt: now }
    }, { upsert: true });
}
export function sanitizeCart(items) {
    const merged = new Map();
    for (const item of items) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const candidate = item;
        const smoothieId = String(candidate.smoothieId ?? '').trim();
        const quantity = Math.max(1, Number(candidate.quantity ?? 1));
        if (!smoothieId || !Number.isFinite(quantity)) {
            continue;
        }
        merged.set(smoothieId, (merged.get(smoothieId) ?? 0) + quantity);
    }
    return [...merged.entries()].map(([smoothieId, quantity]) => ({
        smoothieId,
        quantity
    }));
}
async function getActiveSmoothieIds() {
    const smoothies = await getSmoothiesCollection(getDatabase()).find({ active: true }, { projection: { _id: 0, id: 1 } }).toArray();
    return new Set(smoothies.map((smoothie) => smoothie.id));
}
