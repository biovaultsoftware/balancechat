const HSN_STORES: Array<{ name: string; options?: IDBObjectStoreParameters }> = [
  { name: 'hsn_identity' },
  { name: 'hsn_state_chain', options: { autoIncrement: true } },
  { name: 'hsn_messages', options: { autoIncrement: true } },
  { name: 'hsn_proofs', options: { autoIncrement: true } },
  { name: 'hsn_outbox', options: { keyPath: 'nonce' } }, // Guarantees idempotent deletes, safe retries, no duplication
  { name: 'hsn_inbox', options: { autoIncrement: true } },
  { name: 'hsn_sync_log', options: { keyPath: 'nonce' } }
];

export class Storage {
  static async initDB(): Promise<IDBDatabase> {
    const request = indexedDB.open('BalanceChainHSN', 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      for (const { name, options } of HSN_STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, options);
      }
    };
    return new Promise((res, rej) => {
      request.onsuccess = () => res(request.result);
      request.onerror = () => rej(request.error);
    });
  }
}
