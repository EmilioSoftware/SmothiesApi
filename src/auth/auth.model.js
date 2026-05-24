export const USERS_COLLECTION = 'users';

export function getUsersCollection(db) {
  return db.collection(USERS_COLLECTION);
}

export async function ensureUserIndexes(db) {
  await Promise.all([
    getUsersCollection(db).createIndex({ phoneKey: 1 }, { unique: true }),
    getUsersCollection(db).createIndex({ clientIds: 1 }),
    getUsersCollection(db).createIndex({ admin: 1 })
  ]);
}
