export const ORDERS_COLLECTION = 'orders';

export function getOrdersCollection(db) {
  return db.collection(ORDERS_COLLECTION);
}

export async function ensureOrderIndexes(db) {
  await Promise.all([
    getOrdersCollection(db).createIndex({ id: 1 }, { unique: true }),
    getOrdersCollection(db).createIndex({ clientId: 1 })
  ]);
}
