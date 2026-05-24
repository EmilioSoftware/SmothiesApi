import { getDatabase, unwrapDocument } from '../database/mongodb.js';
import { HttpError } from '../shared/http-error.js';
import { asObject, requiredText } from '../shared/validation.js';
import { getUsersCollection } from './auth.model.js';

export async function loginUserSession(clientId, payload) {
  const body = asObject(payload);
  const now = new Date();
  const name = requiredText(body.name, 'name', 80);
  const phone = requiredText(body.phone, 'phone', 30);
  const phoneKey = normalizePhoneKey(phone);

  if (phoneKey.length < 7) {
    throw new HttpError(400, 'phone no es valido.');
  }

  await getUsersCollection(getDatabase()).updateMany(
    {
      phoneKey: { $ne: phoneKey },
      clientIds: clientId
    },
    {
      $pull: { clientIds: clientId },
      $set: { updatedAt: now }
    }
  );

  const user = unwrapDocument(
    await getUsersCollection(getDatabase()).findOneAndUpdate(
      { phoneKey },
      {
        $setOnInsert: {
          userId: createUserId(phoneKey),
          admin: false,
          createdAt: now
        },
        $set: {
          name,
          phone,
          phoneKey,
          updatedAt: now,
          lastLoginAt: now
        },
        $addToSet: {
          clientIds: clientId
        }
      },
      { upsert: true, returnDocument: 'after' }
    )
  );

  return toSessionDto(user);
}

export async function getSessionUserByClientId(clientId) {
  if (!clientId) {
    return null;
  }

  return getUsersCollection(getDatabase()).findOne({ clientIds: clientId });
}

export async function getSessionDtoByClientId(clientId) {
  const user = await getSessionUserByClientId(clientId);
  return user ? toSessionDto(user) : null;
}

export async function logoutUserSession(clientId) {
  if (!clientId) {
    return;
  }

  await getUsersCollection(getDatabase()).updateMany(
    { clientIds: clientId },
    {
      $pull: { clientIds: clientId },
      $set: { updatedAt: new Date() }
    }
  );
}

function toSessionDto(user) {
  if (!user) {
    throw new HttpError(401, 'Sesion no encontrada.');
  }

  return {
    userId: String(user.userId ?? '').trim(),
    name: String(user.name ?? '').trim(),
    phone: String(user.phone ?? '').trim(),
    admin: Boolean(user.admin)
  };
}

function normalizePhoneKey(phone) {
  const source = String(phone ?? '').trim();
  const digits = source.replace(/\D/g, '');

  if (digits) {
    return digits;
  }

  return source.toLowerCase();
}

function createUserId(phoneKey) {
  return `user-${phoneKey}-${Math.random().toString(36).slice(2, 8)}`;
}
