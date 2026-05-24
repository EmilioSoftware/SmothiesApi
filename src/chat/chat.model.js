export const CHAT_THREADS_COLLECTION = 'chatthreads';

export function getChatThreadsCollection(db) {
  return db.collection(CHAT_THREADS_COLLECTION);
}

export async function ensureChatThreadIndexes(db) {
  await Promise.all([
    getChatThreadsCollection(db).createIndex({ threadKey: 1 }, { unique: true }),
    getChatThreadsCollection(db).createIndex({ clientId: 1 })
  ]);
}
