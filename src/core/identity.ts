import { hashString } from './hash';

export type HIK = {
  hikHash: string;
  signPublicKey: CryptoKey;
  signPrivateKey: CryptoKey;
  dhPublicKey: CryptoKey;
  dhPrivateKey: CryptoKey;
};

export class Identity {
  static async initHIK(db: IDBDatabase): Promise<HIK> {
    const tx = db.transaction('hsn_identity', 'readwrite');
    const store = tx.objectStore('hsn_identity');

    const existing: any = await new Promise((res) => {
      const req = store.get(1);
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    });
    if (existing) return existing as HIK;

    const sign = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const dh = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);

    const exportedSign = await crypto.subtle.exportKey('jwk', sign.publicKey);
    const exportedDh = await crypto.subtle.exportKey('jwk', dh.publicKey);

    const hikHash = await hashString(JSON.stringify({ s: exportedSign, d: exportedDh }));

    const record: HIK = {
      hikHash,
      signPublicKey: sign.publicKey,
      signPrivateKey: sign.privateKey,
      dhPublicKey: dh.publicKey,
      dhPrivateKey: dh.privateKey
    };

    await new Promise<void>((res, rej) => {
      const put = store.put(record, 1);
      put.onsuccess = () => res();
      put.onerror = () => rej(put.error);
    });

    return record;
  }
}
