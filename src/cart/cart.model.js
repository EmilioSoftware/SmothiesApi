export const CARTS_COLLECTION = 'carts';

export function getCartsCollection(db) {
  return db.collection(CARTS_COLLECTION);
}

export async function ensureCartIndexes(db) {
  await getCartsCollection(db).createIndex({ clientId: 1 }, { unique: true });
}
