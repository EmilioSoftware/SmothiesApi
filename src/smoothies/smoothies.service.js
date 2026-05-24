import { getCartsCollection } from '../cart/cart.model.js';
import { getDatabase, unwrapDocument } from '../database/mongodb.js';
import { HttpError } from '../shared/http-error.js';
import { asObject, booleanValue, numberValue, requiredText } from '../shared/validation.js';
import { SMOOTHIE_SEED } from './smoothie.seed.js';
import { getSmoothiesCollection } from './smoothie.model.js';
import { SMOOTHIE_CATEGORY_ORDER, SMOOTHIE_IMAGE_PRESETS } from './smoothie.types.js';
export async function ensureSmoothieSeed() {
    const smoothies = getSmoothiesCollection(getDatabase());
    const existingCount = await smoothies.estimatedDocumentCount();
    if (existingCount > 0) {
        return;
    }
    const now = new Date();
    await smoothies.insertMany(SMOOTHIE_SEED.map((smoothie) => ({
        ...smoothie,
        createdAt: now,
        updatedAt: now
    })));
}
export async function listSmoothies(query) {
    const smoothies = getSmoothiesCollection(getDatabase());
    const filter = {};
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
    return (await smoothies.find(filter).sort({ popular: -1, name: 1 }).toArray()).map(toDto);
}
export async function createSmoothie(payload) {
    const draft = toDraft(payload);
    const now = new Date();
    const smoothie = {
        ...toStoredSmoothieDraft(draft),
        id: await createUniqueId(draft.name),
        createdAt: now,
        updatedAt: now
    };
    await getSmoothiesCollection(getDatabase()).insertOne(smoothie);
    return toDto(smoothie);
}
export async function updateSmoothie(id, payload) {
    const draft = toDraft(payload);
    const smoothie = unwrapDocument(await getSmoothiesCollection(getDatabase()).findOneAndUpdate({ id }, {
        $set: {
            ...toStoredSmoothieDraft(draft),
            updatedAt: new Date()
        }
    }, { returnDocument: 'after' }));
    if (!smoothie) {
        throw new HttpError(404, 'Smoothie no encontrado.');
    }
    if (!smoothie.active) {
        await removeSmoothieFromAllCarts(id);
    }
    return toDto(smoothie);
}
export async function deleteSmoothie(id) {
    const result = await getSmoothiesCollection(getDatabase()).deleteOne({ id });
    if (result.deletedCount === 0) {
        throw new HttpError(404, 'Smoothie no encontrado.');
    }
    await removeSmoothieFromAllCarts(id);
}
export async function toggleFavorite(id) {
    return toDto(await toggleSmoothieFlag(id, 'favorite'));
}
export async function togglePopular(id) {
    return toDto(await toggleSmoothieFlag(id, 'popular'));
}
export async function toggleActive(id) {
    const smoothie = await toggleSmoothieFlag(id, 'active');
    if (!smoothie.active) {
        await removeSmoothieFromAllCarts(id);
    }
    return toDto(smoothie);
}
export function parseCatalogQuery(raw) {
    return {
        searchTerm: String(raw.searchTerm ?? '').trim(),
        category: normalizeFilterCategory(String(raw.category ?? 'Todos')),
        includeInactive: raw.includeInactive === 'true' || raw.includeInactive === true
    };
}
export function toDto(smoothie) {
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
function toDraft(payload) {
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
function normalizeFilterCategory(category) {
    return category === 'Todos' ? 'Todos' : normalizeCategory(category);
}
function normalizeCategory(category) {
    return SMOOTHIE_CATEGORY_ORDER.includes(category) ? category : 'Clasicos';
}
function normalizeImagePreset(preset) {
    const candidate = typeof preset === 'string' ? preset : '';
    return SMOOTHIE_IMAGE_PRESETS.includes(candidate)
        ? candidate
        : 'green-power';
}
async function findSmoothie(id) {
    const smoothie = await getSmoothiesCollection(getDatabase()).findOne({ id });
    if (!smoothie) {
        throw new HttpError(404, 'Smoothie no encontrado.');
    }
    return smoothie;
}
async function toggleSmoothieFlag(id, field) {
    const current = await findSmoothie(id);
    const smoothie = unwrapDocument(await getSmoothiesCollection(getDatabase()).findOneAndUpdate({ id }, {
        $set: {
            [field]: !Boolean(current[field]),
            updatedAt: new Date()
        }
    }, { returnDocument: 'after' }));
    if (!smoothie) {
        throw new HttpError(404, 'Smoothie no encontrado.');
    }
    return smoothie;
}
async function createUniqueId(name) {
    const smoothies = getSmoothiesCollection(getDatabase());
    const baseId = name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'smoothie';
    let candidate = baseId;
    let counter = 2;
    while (await smoothies.findOne({ id: candidate }, { projection: { _id: 1 } })) {
        candidate = `${baseId}-${counter}`;
        counter += 1;
    }
    return candidate;
}
async function removeSmoothieFromAllCarts(smoothieId) {
    await getCartsCollection(getDatabase()).updateMany({ 'items.smoothieId': smoothieId }, {
        $pull: { items: { smoothieId } },
        $set: { updatedAt: new Date() }
    });
}
function toStoredSmoothieDraft(draft) {
    return {
        name: draft.name,
        description: draft.description,
        category: draft.category,
        ingredients: draft.ingredients,
        price: draft.price,
        calories: draft.calories,
        prepMinutes: draft.prepMinutes,
        popular: draft.popular,
        favorite: draft.favorite,
        active: draft.active,
        imagePreset: draft.image
    };
}
