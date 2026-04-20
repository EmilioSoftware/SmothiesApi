import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

import { createChatMessage } from '../chat/chat.service';
import { env } from '../config/env';
import { CustomerOrderDto, updateOrderStatus } from '../orders/orders.service';
import { isValidAdminToken } from '../shared/middlewares/admin-auth.middleware';

interface ClientToServerEvents {
  'chat:join': (payload: { clientId?: string; orderId?: string }) => void;
  'chat:message:create': (
    payload: { clientId?: string; orderId?: string; body?: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void;
  'admin:order:updateStatus': (
    payload: { orderId?: string; status?: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void;
}

interface ServerToClientEvents {
  'catalog:updated': () => void;
  'cart:updated': () => void;
  'order:created': (order: CustomerOrderDto) => void;
  'order:updated': (order: CustomerOrderDto) => void;
  'chat:message': (payload: unknown) => void;
  'chat:thread:updated': (payload: unknown) => void;
}

class RealtimeHub {
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

  init(server: HttpServer): void {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
      cors: {
        origin: env.socketCorsOrigin,
        credentials: true
      }
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  emitCatalogUpdated(): void {
    this.io?.emit('catalog:updated');
  }

  emitCartUpdated(clientId: string): void {
    this.io?.to(this.clientRoom(clientId)).emit('cart:updated');
  }

  emitAllCartsUpdated(): void {
    this.io?.emit('cart:updated');
  }

  emitOrderCreated(order: CustomerOrderDto): void {
    if (order.clientId) {
      this.io?.to(this.clientRoom(order.clientId)).emit('order:created', order);
    }

    this.io?.to('admins').emit('order:created', order);
  }

  emitOrderUpdated(order: CustomerOrderDto): void {
    if (order.clientId) {
      this.io?.to(this.clientRoom(order.clientId)).emit('order:updated', order);
    }

    this.io?.to('admins').emit('order:updated', order);
  }

  private handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    const clientId = this.normalizeText(socket.handshake.auth?.clientId);
    const adminToken = this.normalizeText(socket.handshake.auth?.adminToken);

    if (clientId) {
      socket.data.clientId = clientId;
      void socket.join(this.clientRoom(clientId));
    }

    if (isValidAdminToken(adminToken)) {
      socket.data.isAdmin = true;
      void socket.join('admins');
    }

    socket.on('chat:join', (payload) => {
      const targetClientId = socket.data.isAdmin ? this.normalizeText(payload?.clientId) : socket.data.clientId;

      if (targetClientId) {
        void socket.join(this.chatRoom(targetClientId, this.normalizeText(payload?.orderId)));
      }
    });

    socket.on('chat:message:create', (payload, ack) => {
      void this.handleChatMessage(socket, payload, ack);
    });

    socket.on('admin:order:updateStatus', (payload, ack) => {
      void this.handleAdminOrderStatus(socket, payload, ack);
    });
  }

  private async handleChatMessage(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    payload: { clientId?: string; orderId?: string; body?: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ): Promise<void> {
    try {
      const clientId = socket.data.isAdmin ? this.normalizeText(payload?.clientId) : socket.data.clientId;

      if (!clientId) {
        throw new Error('clientId requerido para chat.');
      }

      const thread = await createChatMessage({
        clientId,
        orderId: this.normalizeText(payload?.orderId),
        sender: socket.data.isAdmin ? 'admin' : 'client',
        body: payload?.body
      });
      const eventPayload = {
        threadKey: thread.threadKey,
        clientId: thread.clientId,
        orderId: thread.orderId,
        message: thread.lastMessage
      };

      this.io?.to(this.clientRoom(clientId)).emit('chat:message', eventPayload);
      this.io?.to('admins').emit('chat:message', eventPayload);
      this.io?.to('admins').emit('chat:thread:updated', thread);
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : 'No se pudo enviar el mensaje.' });
    }
  }

  private async handleAdminOrderStatus(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    payload: { orderId?: string; status?: string },
    ack?: (response: { ok: boolean; error?: string }) => void
  ): Promise<void> {
    try {
      if (!socket.data.isAdmin) {
        throw new Error('Token admin requerido.');
      }

      const orderId = this.normalizeText(payload?.orderId);

      if (!orderId) {
        throw new Error('orderId requerido.');
      }

      this.emitOrderUpdated(await updateOrderStatus(orderId, payload?.status));
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : 'No se pudo actualizar el pedido.' });
    }
  }

  private clientRoom(clientId: string): string {
    return `client:${clientId}`;
  }

  private chatRoom(clientId: string, orderId?: string): string {
    return orderId ? `chat:${clientId}:${orderId}` : `chat:${clientId}`;
  }

  private normalizeText(value: unknown): string | undefined {
    const text = String(value ?? '').trim();
    return text || undefined;
  }
}

export const realtimeHub = new RealtimeHub();
