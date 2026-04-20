import { clearCart, getCart } from '../cart/cart.service';
import { HttpError } from '../shared/http-error';
import { asObject, optionalText, requiredText } from '../shared/validation';
import { SmoothieModel } from '../smoothies/smoothie.model';
import { SmoothieDto } from '../smoothies/smoothie.types';
import { OrderDocument, OrderModel, OrderStatus } from './order.model';

export interface OrderLineSnapshotDto {
  smoothieId: string;
  quantity: number;
  name: string;
  category: SmoothieDto['category'];
  price: number;
  prepMinutes: number;
  imagePreset: SmoothieDto['imagePreset'];
}

export interface CustomerOrderDto {
  id: string;
  status: OrderStatus;
  headline: string;
  note: string;
  createdAt: string;
  items: OrderLineSnapshotDto[];
  clientId?: string;
  customer?: {
    name: string;
    phone: string;
  };
  payment?: {
    method: string;
    status: string;
    reference: string;
    last4?: string;
  };
  total?: number;
}

export async function listOrdersByClient(clientId: string): Promise<CustomerOrderDto[]> {
  const orders = await OrderModel.find({ clientId }).sort({ createdAt: -1 });
  return orders.map((order) => toOrderDto(order, false));
}

export async function listAdminOrders(): Promise<CustomerOrderDto[]> {
  const orders = await OrderModel.find({}).sort({ createdAt: -1 }).limit(80);
  return orders.map((order) => toOrderDto(order, true));
}

export async function updateOrderStatus(id: string, status: unknown): Promise<CustomerOrderDto> {
  const nextStatus = normalizeOrderStatus(status);
  const order = await OrderModel.findOneAndUpdate(
    { id },
    {
      status: nextStatus,
      headline: headlineForStatus(nextStatus),
      note: noteForStatus(nextStatus)
    },
    { new: true }
  );

  if (!order) {
    throw new HttpError(404, 'Pedido no encontrado.');
  }

  return toOrderDto(order, true);
}

export async function checkoutCart(clientId: string, payload: unknown): Promise<CustomerOrderDto> {
  const checkout = toCheckoutPayload(payload);
  const cart = await getCart(clientId);

  if (cart.length === 0) {
    throw new HttpError(400, 'El carrito esta vacio.');
  }

  const smoothies = await SmoothieModel.find({
    active: true,
    id: { $in: cart.map((item) => item.smoothieId) }
  }).lean();
  const smoothiesById = new Map(smoothies.map((smoothie) => [smoothie.id, smoothie]));
  const items: OrderLineSnapshotDto[] = [];

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

  const order = await OrderModel.create({
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
    items
  });

  await clearCart(clientId);
  return toOrderDto(order, true);
}

export function toOrderDto(order: OrderDocument, includePrivate: boolean): CustomerOrderDto {
  const dto: CustomerOrderDto = {
    id: order.id,
    status: order.status,
    headline: order.headline,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
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

function toCheckoutPayload(payload: unknown): {
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  cardLast4?: string;
} {
  const body = asObject(payload);
  const cardLast4 = optionalText(body.cardLast4, 4);

  return {
    customerName: requiredText(body.customerName, 'customerName', 80),
    customerPhone: requiredText(body.customerPhone, 'customerPhone', 30),
    paymentMethod: optionalText(body.paymentMethod, 40) || 'simulated-card',
    cardLast4: cardLast4 || undefined
  };
}

function normalizeOrderStatus(status: unknown): OrderStatus {
  if (status === 'delivered' || status === 'cancelled' || status === 'processing') {
    return status;
  }

  throw new HttpError(400, 'status no es valido.');
}

function headlineForStatus(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'En camino';
  }
}

function noteForStatus(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return 'Pedido entregado con exito.';
    case 'cancelled':
      return 'El pedido fue cancelado antes de prepararse.';
    default:
      return 'Estamos preparando tu pedido.';
  }
}

async function createOrderId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${Math.floor(10000 + Math.random() * 90000)}`;

    if (!(await OrderModel.exists({ id: candidate }))) {
      return candidate;
    }
  }

  return `${Date.now()}`.slice(-6);
}

function createPaymentReference(): string {
  return `SIM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
