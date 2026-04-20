import { FilterQuery } from 'mongoose';

import { CartModel } from '../cart/cart.model';
import { HttpError } from '../shared/http-error';
import { asObject, booleanValue, numberValue, requiredText } from '../shared/validation';
import { SMOOTHIE_SEED } from './smoothie.seed';
import { SmoothieDocument, SmoothieModel } from './smoothie.model';
import {
  CatalogQuery,
  SMOOTHIE_CATEGORY_ORDER,
  SMOOTHIE_IMAGE_PRESETS,
  SmoothieCategory,
  SmoothieDraft,
  SmoothieDto,
  SmoothieImagePreset
} from './smoothie.types';

export async function ensureSmoothieSeed(): Promise<void> {
  const existingCount = await SmoothieModel.estimatedDocumentCount();

  if (existingCount > 0) {
    return;
  }

  await SmoothieModel.insertMany(SMOOTHIE_SEED);
}

export async function listSmoothies(query: CatalogQuery): Promise<SmoothieDto[]> {
  const filter: FilterQuery<SmoothieDocument> = {};

  if (!query.includeInactive) {
    filter.active = true;
  }

  if (query.category && query.category !== 'Todos') {
    filter.category = query.category;
  }

  if (query.searchTerm) {
    const pattern = query.searchTerm.trim();
    filter.$or = [
      { name: new RegExp(pattern, 'i') },
      { description: new RegExp(pattern, 'i') },
      { ingredients: new RegExp(pattern, 'i') }
    ];
  }

  const smoothies = await SmoothieModel.find(filter).sort({ popular: -1, name: 1 }).lean();
  return smoothies.map(toDto);
}

export async function createSmoothie(payload: unknown): Promise<SmoothieDto> {
  const draft = toDraft(payload);
  const smoothie = await SmoothieModel.create({
    ...draft,
    id: await createUniqueId(draft.name),
    imagePreset: draft.image
  });

  return toDto(smoothie);
}

export async function updateSmoothie(id: string, payload: unknown): Promise<SmoothieDto> {
  const draft = toDraft(payload);
  const smoothie = await SmoothieModel.findOneAndUpdate(
    { id },
    {
      ...draft,
      imagePreset: draft.image
    },
    { new: true }
  );

  if (!smoothie) {
    throw new HttpError(404, 'Smoothie no encontrado.');
  }

  if (!smoothie.active) {
    await removeSmoothieFromAllCarts(id);
  }

  return toDto(smoothie);
}

export async function deleteSmoothie(id: string): Promise<void> {
  const result = await SmoothieModel.deleteOne({ id });

  if (result.deletedCount === 0) {
    throw new HttpError(404, 'Smoothie no encontrado.');
  }

  await removeSmoothieFromAllCarts(id);
}

export async function toggleFavorite(id: string): Promise<SmoothieDto> {
  const smoothie = await findSmoothie(id);
  smoothie.favorite = !smoothie.favorite;
  await smoothie.save();
  return toDto(smoothie);
}

export async function togglePopular(id: string): Promise<SmoothieDto> {
  const smoothie = await findSmoothie(id);
  smoothie.popular = !smoothie.popular;
  await smoothie.save();
  return toDto(smoothie);
}

export async function toggleActive(id: string): Promise<SmoothieDto> {
  const smoothie = await findSmoothie(id);
  smoothie.active = !smoothie.active;
  await smoothie.save();

  if (!smoothie.active) {
    await removeSmoothieFromAllCarts(id);
  }

  return toDto(smoothie);
}

export function parseCatalogQuery(raw: Record<string, unknown>): CatalogQuery {
  return {
    searchTerm: String(raw.searchTerm ?? '').trim(),
    category: normalizeFilterCategory(String(raw.category ?? 'Todos')),
    includeInactive: raw.includeInactive === 'true' || raw.includeInactive === true
  };
}

export function toDto(smoothie: Pick<SmoothieDocument, keyof SmoothieDto>): SmoothieDto {
  return {
    id: smoothie.id,
    name: smoothie.name,
    description: smoothie.description,
    category: normalizeCategory(smoothie.category),
    ingredients: smoothie.ingredients,
    price: Number(smoothie.price),
    calories: Number(smoothie.calories),
    prepMinutes: Math.max(1, Number(smoothie.prepMinutes)),
    popular: Boolean(smoothie.popular),
    favorite: Boolean(smoothie.favorite),
    active: smoothie.active !== false,
    imagePreset: normalizeImagePreset(smoothie.imagePreset)
  };
}

function toDraft(payload: unknown): SmoothieDraft {
  const body = asObject(payload);
  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];

  if (ingredients.length === 0) {
    throw new HttpError(400, 'ingredients es requerido.');
  }

  return {
    name: requiredText(body.name, 'name', 40),
    description: requiredText(body.description, 'description', 180),
    category: normalizeCategory(String(body.category ?? 'Clasicos')),
    ingredients,
    price: numberValue(body.price, 'price', 1),
    calories: numberValue(body.calories, 'calories', 0),
    prepMinutes: Math.max(1, numberValue(body.prepMinutes, 'prepMinutes', 1)),
    popular: booleanValue(body.popular, false),
    favorite: booleanValue(body.favorite, false),
    active: body.active !== false,
    image: normalizeImagePreset(body.image ?? body.imagePreset)
  };
}

function normalizeFilterCategory(category: string): CatalogQuery['category'] {
  return category === 'Todos' ? 'Todos' : normalizeCategory(category);
}

function normalizeCategory(category: string): SmoothieCategory {
  return SMOOTHIE_CATEGORY_ORDER.includes(category as SmoothieCategory) ? (category as SmoothieCategory) : 'Clasicos';
}

function normalizeImagePreset(preset: unknown): SmoothieImagePreset {
  const candidate = typeof preset === 'string' ? preset : '';
  return SMOOTHIE_IMAGE_PRESETS.includes(candidate as SmoothieImagePreset)
    ? (candidate as SmoothieImagePreset)
    : 'green-power';
}

async function findSmoothie(id: string): Promise<SmoothieDocument & { save: () => Promise<unknown> }> {
  const smoothie = await SmoothieModel.findOne({ id });

  if (!smoothie) {
    throw new HttpError(404, 'Smoothie no encontrado.');
  }

  return smoothie;
}

async function createUniqueId(name: string): Promise<string> {
  const baseId =
    name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'smoothie';
  let candidate = baseId;
  let counter = 2;

  while (await SmoothieModel.exists({ id: candidate })) {
    candidate = `${baseId}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function removeSmoothieFromAllCarts(smoothieId: string): Promise<void> {
  await CartModel.updateMany({}, { $pull: { items: { smoothieId } } });
}
