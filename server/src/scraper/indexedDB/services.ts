import { IDBOperationResult } from '../../lib/types';

export async function getAuthState(): Promise<
  IDBOperationResult<{ authState: string }>
> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('tweb');

    open.onerror = () => reject({ error: new Error('Failed to open DB!') });

    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('session', 'readonly');
      const store = transaction.objectStore('session');
      const query = store.get('authState');

      query.onsuccess = () =>
        resolve({ data: { authState: query.result['_'] } });
      query.onerror = () =>
        reject({ error: new Error('Failed to retrieve data!') });
    };
  });
}
