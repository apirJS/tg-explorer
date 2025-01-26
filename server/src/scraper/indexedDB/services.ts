import { IDBOperationResult } from '../../lib/types';

export async function getAuthState(): Promise<
  IDBOperationResult<{ authState: string }>
> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('tweb');

    open.onerror = () => reject({ error: 'Failed to open DB!' });

    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('session', 'readonly');
      const store = transaction.objectStore('session');
      const query = store.get('session');

      query.onsuccess = () =>
        resolve({ data: { authState: query.result['_'] } });
      query.onerror = () => reject({ error: 'Failed to retrieve data!' });
    };
  });
}

export async function getChannel(
  name: string
): Promise<IDBOperationResult<{ _: string }>> {
  //
}


