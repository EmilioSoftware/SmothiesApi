import { HttpError } from './http-error';

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'El cuerpo de la solicitud no es valido.');
  }

  return value as Record<string, unknown>;
}

export function requiredText(value: unknown, field: string, maxLength = 180): string {
  const text = String(value ?? '').trim();

  if (!text) {
    throw new HttpError(400, `${field} es requerido.`);
  }

  if (text.length > maxLength) {
    throw new HttpError(400, `${field} supera el maximo permitido.`);
  }

  return text;
}

export function optionalText(value: unknown, maxLength = 180): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

export function numberValue(value: unknown, field: string, minimum = 0): number {
  const candidate = Number(value);

  if (!Number.isFinite(candidate) || candidate < minimum) {
    throw new HttpError(400, `${field} debe ser un numero valido.`);
  }

  return candidate;
}

export function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
