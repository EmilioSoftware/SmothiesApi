import { HttpError } from './http-error.js';
export function asObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new HttpError(400, 'El cuerpo de la solicitud no es valido.');
    }
    return value;
}
export function requiredText(value, field, maxLength = 180) {
    const text = String(value ?? '').trim();
    if (!text) {
        throw new HttpError(400, `${field} es requerido.`);
    }
    if (text.length > maxLength) {
        throw new HttpError(400, `${field} supera el maximo permitido.`);
    }
    return text;
}
export function optionalText(value, maxLength = 180) {
    return String(value ?? '').trim().slice(0, maxLength);
}
export function numberValue(value, field, minimum = 0) {
    const candidate = Number(value);
    if (!Number.isFinite(candidate) || candidate < minimum) {
        throw new HttpError(400, `${field} debe ser un numero valido.`);
    }
    return candidate;
}
export function booleanValue(value, fallback = false) {
    return typeof value === 'boolean' ? value : fallback;
}
