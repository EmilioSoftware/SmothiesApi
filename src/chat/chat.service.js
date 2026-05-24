import { getDatabase, unwrapDocument } from '../database/mongodb.js';
import { getOrdersCollection } from '../orders/order.model.js';
import { HttpError } from '../shared/http-error.js';
import { requiredText } from '../shared/validation.js';
import { getChatThreadsCollection } from './chat.model.js';
export async function getClientThread(clientId, orderId) {
    const thread = await findOrCreateThread(clientId, orderId);
    if (orderId && (!Array.isArray(thread.messages) || thread.messages.length === 0)) {
        return ensureOrderWelcomeThread(clientId, orderId);
    }
    return toThreadDto(thread);
}
export async function listAdminThreads() {
    const threads = await getChatThreadsCollection(getDatabase()).find({}).sort({ updatedAt: -1 }).limit(60).toArray();
    return threads.map((thread) => toThreadDto(thread));
}
export async function ensureOrderWelcomeThread(clientId, orderId, customerName) {
    const { clientId: normalizedClientId, orderId: normalizedOrderId, threadKey } = normalizeThreadInput(clientId, orderId);
    if (!normalizedOrderId) {
        throw new HttpError(400, 'orderId es requerido.');
    }
    const existingThread = await getChatThreadsCollection(getDatabase()).findOne({ threadKey });
    if (existingThread && Array.isArray(existingThread.messages) && existingThread.messages.length > 0) {
        return toThreadDto(existingThread);
    }
    const resolvedCustomerName = customerName || (await getOrdersCollection(getDatabase()).findOne({
        id: normalizedOrderId,
        clientId: normalizedClientId
    }))?.customer?.name;
    return createChatMessage({
        clientId: normalizedClientId,
        orderId: normalizedOrderId,
        sender: 'admin',
        body: buildWelcomeMessage(resolvedCustomerName)
    });
}
export async function createChatMessage(input) {
    const body = requiredText(input.body, 'body', 600);
    const { clientId, orderId, threadKey } = normalizeThreadInput(input.clientId, input.orderId);
    const now = new Date();
    const message = {
        id: `message-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        sender: input.sender,
        body,
        timestamp: input.sender === 'admin' ? 'Admin' : 'Tu',
        createdAt: now
    };
    const thread = unwrapDocument(await getChatThreadsCollection(getDatabase()).findOneAndUpdate({ threadKey }, {
        $setOnInsert: createThreadDocument(clientId, orderId, now),
        $push: { messages: message },
        $set: { updatedAt: now }
    }, { upsert: true, returnDocument: 'after' }));
    return toThreadDto(thread);
}
export function resolveThreadKey(clientId, orderId) {
    return orderId ? `${clientId}:${orderId}` : clientId;
}
async function findOrCreateThread(clientId, orderId) {
    const { clientId: normalizedClientId, orderId: normalizedOrderId, threadKey } = normalizeThreadInput(clientId, orderId);
    const now = new Date();
    return unwrapDocument(await getChatThreadsCollection(getDatabase()).findOneAndUpdate({ threadKey }, {
        $setOnInsert: createThreadDocument(normalizedClientId, normalizedOrderId, now),
        $set: { updatedAt: now }
    }, { upsert: true, returnDocument: 'after' }));
}
function toThreadDto(thread) {
    const messages = (Array.isArray(thread.messages) ? thread.messages : []).map(toMessageDto);
    return {
        threadKey: thread.threadKey,
        clientId: thread.clientId,
        orderId: thread.orderId,
        messages,
        lastMessage: messages[messages.length - 1],
        updatedAt: toIsoDate(thread.updatedAt)
    };
}
function toMessageDto(message) {
    return {
        id: message.id,
        sender: message.sender,
        body: message.body,
        timestamp: message.timestamp,
        createdAt: toIsoDate(message.createdAt)
    };
}
function normalizeThreadInput(clientId, orderId) {
    const normalizedClientId = String(clientId ?? '').trim();
    if (!normalizedClientId) {
        throw new HttpError(400, 'clientId es requerido.');
    }
    const normalizedOrderId = String(orderId ?? '').trim() || undefined;
    return {
        clientId: normalizedClientId,
        orderId: normalizedOrderId,
        threadKey: resolveThreadKey(normalizedClientId, normalizedOrderId)
    };
}
function createThreadDocument(clientId, orderId, now) {
    return {
        threadKey: resolveThreadKey(clientId, orderId),
        clientId,
        ...(orderId ? { orderId } : {}),
        createdAt: now
    };
}
function buildWelcomeMessage(customerName) {
    const firstName = String(customerName ?? '').trim().split(/\s+/).find(Boolean);
    if (firstName) {
        return `Gracias por realizar tu pedido, ${firstName}. En unos minutos estara listo.`;
    }
    return 'Gracias por realizar tu pedido. En unos minutos estara listo.';
}
function toIsoDate(value) {
    return value instanceof Date ? value.toISOString() : new Date(value ?? Date.now()).toISOString();
}
