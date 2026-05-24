import { Server } from 'socket.io';
import { getSessionUserByClientId } from '../auth/auth.service.js';
import { createChatMessage } from '../chat/chat.service.js';
import { env } from '../config/env.js';
import { updateOrderStatus } from '../orders/orders.service.js';
class RealtimeHub {
    io = null;
    init(server) {
        this.io = new Server(server, {
            cors: {
                origin: env.socketCorsOrigin,
                credentials: true
            }
        });
        this.io.on('connection', (socket) => this.handleConnection(socket));
    }
    emitCatalogUpdated() {
        this.io?.emit('catalog:updated');
    }
    emitCartUpdated(clientId) {
        this.io?.to(this.clientRoom(clientId)).emit('cart:updated');
    }
    emitAllCartsUpdated() {
        this.io?.emit('cart:updated');
    }
    emitOrderCreated(order) {
        if (order.clientId) {
            this.io?.to(this.clientRoom(order.clientId)).emit('order:created', order);
        }
        this.io?.to('admins').emit('order:created', order);
    }
    emitOrderUpdated(order) {
        if (order.clientId) {
            this.io?.to(this.clientRoom(order.clientId)).emit('order:updated', order);
        }
        this.io?.to('admins').emit('order:updated', order);
    }
    emitChatThreadUpdated(thread) {
        const eventPayload = {
            threadKey: thread.threadKey,
            clientId: thread.clientId,
            orderId: thread.orderId,
            message: thread.lastMessage
        };
        this.io?.to(this.clientRoom(thread.clientId)).emit('chat:message', eventPayload);
        this.io?.to('admins').emit('chat:message', eventPayload);
        this.io?.to('admins').emit('chat:thread:updated', thread);
    }
    handleConnection(socket) {
        const clientId = this.normalizeText(socket.handshake.auth?.clientId);
        if (clientId) {
            socket.data.clientId = clientId;
        }
        socket.data.userContextReady = this.refreshUserContext(socket);
        socket.on('realtime:context', (...args) => {
            const ack = args.find((entry) => typeof entry === 'function');
            void this.handleSessionContextRefresh(socket, ack);
        });
        socket.on('chat:join', (payload) => {
            void this.handleChatJoin(socket, payload);
        });
        socket.on('chat:message:create', (payload, ack) => {
            void this.handleChatMessage(socket, payload, ack);
        });
        socket.on('admin:order:updateStatus', (payload, ack) => {
            void this.handleAdminOrderStatus(socket, payload, ack);
        });
    }
    async refreshUserContext(socket) {
        const clientId = socket.data.clientId ?? this.normalizeText(socket.handshake.auth?.clientId);
        socket.data.userId = undefined;
        socket.data.isAdmin = false;
        if (!clientId) {
            return {
                clientId: undefined,
                isAdmin: false
            };
        }
        socket.data.clientId = clientId;
        void socket.join(this.clientRoom(clientId));
        const user = await getSessionUserByClientId(clientId);
        if (!user) {
            socket.leave('admins');
            return {
                clientId,
                isAdmin: false
            };
        }
        socket.data.userId = user.userId;
        socket.data.isAdmin = Boolean(user.admin);
        if (user.admin) {
            void socket.join('admins');
        }
        else {
            socket.leave('admins');
        }
        return {
            clientId,
            isAdmin: Boolean(user.admin)
        };
    }
    async handleSessionContextRefresh(socket, ack) {
        try {
            await socket.data.userContextReady;
            ack?.({
                ok: true,
                clientId: socket.data.clientId,
                isAdmin: Boolean(socket.data.isAdmin)
            });
        }
        catch (error) {
            ack?.({ ok: false, error: error instanceof Error ? error.message : 'No se pudo validar la sesion.' });
        }
    }
    async handleChatJoin(socket, payload) {
        try {
            await socket.data.userContextReady;
            const socketClientId = socket.data.clientId ?? this.normalizeText(socket.handshake.auth?.clientId);
            const targetClientId = socket.data.isAdmin ? this.normalizeText(payload?.clientId) : socketClientId;
            if (targetClientId) {
                await socket.join(this.chatRoom(targetClientId, this.normalizeText(payload?.orderId)));
            }
        }
        catch {
            return;
        }
    }
    async handleChatMessage(socket, payload, ack) {
        try {
            await socket.data.userContextReady;
            const socketClientId = socket.data.clientId ?? this.normalizeText(socket.handshake.auth?.clientId);
            const clientId = socket.data.isAdmin ? this.normalizeText(payload?.clientId) : socketClientId;
            if (!clientId) {
                throw new Error('clientId requerido para chat.');
            }
            const thread = await createChatMessage({
                clientId,
                orderId: this.normalizeText(payload?.orderId),
                sender: socket.data.isAdmin ? 'admin' : 'client',
                body: payload?.body
            });
            this.emitChatThreadUpdated(thread);
            ack?.({ ok: true });
        }
        catch (error) {
            ack?.({ ok: false, error: error instanceof Error ? error.message : 'No se pudo enviar el mensaje.' });
        }
    }
    async handleAdminOrderStatus(socket, payload, ack) {
        try {
            await socket.data.userContextReady;
            if (!socket.data.isAdmin) {
                throw new Error('Permisos admin requeridos.');
            }
            const orderId = this.normalizeText(payload?.orderId);
            if (!orderId) {
                throw new Error('orderId requerido.');
            }
            this.emitOrderUpdated(await updateOrderStatus(orderId, payload?.status));
            ack?.({ ok: true });
        }
        catch (error) {
            ack?.({ ok: false, error: error instanceof Error ? error.message : 'No se pudo actualizar el pedido.' });
        }
    }
    clientRoom(clientId) {
        return `client:${clientId}`;
    }
    chatRoom(clientId, orderId) {
        return orderId ? `chat:${clientId}:${orderId}` : `chat:${clientId}`;
    }
    normalizeText(value) {
        const text = String(value ?? '').trim();
        return text || undefined;
    }
}
export const realtimeHub = new RealtimeHub();
