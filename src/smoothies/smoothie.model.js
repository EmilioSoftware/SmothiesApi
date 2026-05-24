export const SMOOTHIES_COLLECTION = 'smoothies';

export function getSmoothiesCollection(db) {
  return db.collection(SMOOTHIES_COLLECTION);
}

export async function ensureSmoothieIndexes(db) {
  await getSmoothiesCollection(db).createIndex({ id: 1 }, { unique: true });
}
