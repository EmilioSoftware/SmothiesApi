import { SmoothieModel } from '../smoothies/smoothie.model';
import { CartItemDocument, CartModel } from './cart.model';

export interface CartItemDto {
  smoothieId: string;
  quantity: number;
}

export async function getCart(clientId: string): Promise<CartItemDto[]> {
  const cart = await CartModel.findOneAndUpdate(
    { clientId },
    { $setOnInsert: { clientId, items: [] } },
    { upsert: true, new: true }
  ).lean();

  return sanitizeCart(cart.items);
}

export async function setCart(clientId: string, items: unknown): Promise<CartItemDto[]> {
  const activeSmoothieIds = await getActiveSmoothieIds();
  const nextItems = sanitizeCart(Array.isArray(items) ? items : []).filter((item) =>
    activeSmoothieIds.has(item.smoothieId)
  );

  const cart = await CartModel.findOneAndUpdate(
    { clientId },
    { clientId, items: nextItems },
    { upsert: true, new: true }
  ).lean();

  return sanitizeCart(cart.items);
}

export async function clearCart(clientId: string): Promise<void> {
  await CartModel.updateOne({ clientId }, { clientId, items: [] }, { upsert: true });
}

export function sanitizeCart(items: unknown[]): CartItemDto[] {
  const merged = new Map<string, number>();

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const candidate = item as Partial<CartItemDocument>;
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

async function getActiveSmoothieIds(): Promise<Set<string>> {
  const smoothies = await SmoothieModel.find({ active: true }, { id: 1 }).lean();
  return new Set(smoothies.map((smoothie) => smoothie.id));
}
