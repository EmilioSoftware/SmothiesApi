import { clearCart, getCart } from '../cart/cart.service.js';
import { ensureOrderWelcomeThread } from '../chat/chat.service.js';
import { getDatabase, unwrapDocument } from '../database/mongodb.js';
import { HttpError } from '../shared/http-error.js';
import { asObject, optionalText, requiredText } from '../shared/validation.js';
import { getSmoothiesCollection } from '../smoothies/smoothie.model.js';
import { getOrdersCollection } from './order.model.js';
export async function listOrdersByClient(clientId) {
    const orders = await getOrdersCollection(getDatabase()).find({ clientId }).sort({ createdAt: -1 }).toArray();
    return orders.map((order) => toOrderDto(order, false));
}
export async function listAdminOrders() {
    const orders = await getOrdersCollection(getDatabase()).find({}).sort({ createdAt: -1 }).limit(80).toArray();
    return orders.map((order) => toOrderDto(order, true));
}
export async function updateOrderStatus(id, status) {
    const nextStatus = normalizeOrderStatus(status);
    const order = unwrapDocument(await getOrdersCollection(getDatabase()).findOneAndUpdate({ id }, {
        $set: {
            status: nextStatus,
            headline: headlineForStatus(nextStatus),
            note: noteForStatus(nextStatus),
            updatedAt: new Date()
        }
    }, { returnDocument: 'after' }));
    if (!order) {
        throw new HttpError(404, 'Pedido no encontrado.');
    }
    return toOrderDto(order, true);
}
export async function checkoutCart(clientId, payload) {
    const checkout = toCheckoutPayload(payload);
    const cart = await getCart(clientId);
    if (cart.length === 0) {
        throw new HttpError(400, 'El carrito esta vacio.');
    }
    const smoothies = await getSmoothiesCollection(getDatabase()).find({
        active: true,
        id: { $in: cart.map((item) => item.smoothieId) }
    }).toArray();
    const smoothiesById = new Map(smoothies.map((smoothie) => [smoothie.id, smoothie]));
    const items = [];
    for (const cartItem of cart) {
        const smoothie = smoothiesById.get(cartItem.smoothieId);
        if (!smoothie) {
            continue;
        }
        items.push({
            smoothieId: smoothie.id,
            quantity: cartItem.quantity,
            name: smoothie.name,
            category: smoothie.category,
            price: smoothie.price,
            prepMinutes: smoothie.prepMinutes,
            imagePreset: smoothie.imagePreset
        });
    }
    if (items.length === 0) {
        throw new HttpError(400, 'No hay smoothies activos en el carrito.');
    }
    const now = new Date();
    const order = {
        id: await createOrderId(),
        clientId,
        status: 'processing',
        headline: headlineForStatus('processing'),
        note: noteForStatus('processing'),
        customer: {
            name: checkout.customerName,
            phone: checkout.customerPhone
        },
        payment: {
            method: checkout.paymentMethod,
            status: 'paid',
            reference: createPaymentReference(),
            last4: checkout.cardLast4
        },
        total: items.reduce((total, item) => total + item.quantity * item.price, 0),
        items,
        createdAt: now,
        updatedAt: now
    };
    await getOrdersCollection(getDatabase()).insertOne(order);
    await clearCart(clientId);
    let thread = null;
    try {
        thread = await ensureOrderWelcomeThread(clientId, order.id, order.customer.name);
    }
    catch {
        thread = null;
    }
    return {
        order: toOrderDto(order, true),
        thread
    };
}
export function toOrderDto(order, includePrivate) {
    const dto = {
        id: order.id,
        status: order.status,
        headline: order.headline,
        note: order.note,
        createdAt: toIsoDate(order.createdAt),
        items: (Array.isArray(order.items) ? order.items : []).map((item) => ({
            smoothieId: item.smoothieId,
            quantity: item.quantity,
            name: item.name,
            category: item.category,
            price: item.price,
            prepMinutes: item.prepMinutes,
            imagePreset: item.imagePreset
        }))
    };
    if (includePrivate) {
        dto.clientId = order.clientId;
        dto.customer = {
            name: order.customer.name,
            phone: order.customer.phone
        };
        dto.payment = {
            method: order.payment.method,
            status: order.payment.status,
            reference: order.payment.reference,
            last4: order.payment.last4
        };
        dto.total = order.total;
    }
    return dto;
}
function toCheckoutPayload(payload) {
    const body = asObject(payload);
    const cardLast4 = optionalText(body.cardLast4, 4);
    return {
        customerName: requiredText(body.customerName, 'customerName', 80),
        customerPhone: requiredText(body.customerPhone, 'customerPhone', 30),
        paymentMethod: optionalText(body.paymentMethod, 40) || 'simulated-card',
        cardLast4: cardLast4 || undefined
    };
}
function normalizeOrderStatus(status) {
    if (status === 'delivered' || status === 'cancelled' || status === 'processing') {
        return status;
    }
    throw new HttpError(400, 'status no es valido.');
}
function headlineForStatus(status) {
    switch (status) {
        case 'delivered':
            return 'Entregado';
        case 'cancelled':
            return 'Cancelado';
        default:
            return 'En camino';
    }
}
function noteForStatus(status) {
    switch (status) {
        case 'delivered':
            return 'Pedido entregado con exito.';
        case 'cancelled':
            return 'El pedido fue cancelado antes de prepararse.';
        default:
            return 'Estamos preparando tu pedido.';
    }
}
async function createOrderId() {
    const orders = getOrdersCollection(getDatabase());
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = `${Math.floor(10000 + Math.random() * 90000)}`;
        if (!(await orders.findOne({ id: candidate }, { projection: { _id: 1 } }))) {
            return candidate;
        }
    }
    return `${Date.now()}`.slice(-6);
}
function createPaymentReference() {
    return `SIM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
function toIsoDate(value) {
    return value instanceof Date ? value.toISOString() : new Date(value ?? Date.now()).toISOString();
}
