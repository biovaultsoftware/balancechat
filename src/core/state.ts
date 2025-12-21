import { canonicalize } from './canonicalize';
import { hashString } from './hash';
import type { HIK } from './identity';

export interface STA {
  type: string;
  from: string;
  to: string;
  payload: any;
  prev_state_hash: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export class State {
  static async createSTA(db: IDBDatabase, hik: HIK, type: string, toHikHash: string, payload: any): Promise<STA> {
    const prevHash = await this.getChainHeadHash(db, toHikHash);
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const staUnsigned = { type, from: hik.hikHash, to: toHikHash, payload, prev_state_hash: prevHash, timestamp, nonce };
    const data = canonicalize(staUnsigned);
    const signature = await this.sign(hik.signPrivateKey, data);

    return { ...staUnsigned, signature };
  }

  static async appendSTA(db: IDBDatabase, sta: STA, senderSignPublicKey: CryptoKey): Promise<boolean> {
    if (!(await this.validateSTA(db, sta, senderSignPublicKey))) return false;

    const tx = db.transaction(['hsn_state_chain', 'hsn_sync_log', 'hsn_messages'], 'readwrite');
    try {
      tx.objectStore('hsn_state_chain').add(sta);
      tx.objectStore('hsn_sync_log').add({ nonce: sta.nonce, timestamp: sta.timestamp });
      await this.interpretSTA(tx, sta);
      await new Promise<void>((res, rej) => {
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error);
      });
      return true;
    } catch {
      try { tx.abort(); } catch {}
      return false;
    }
  }

  // RULE FOR DEVS: interpretSTA() must never throw for non-critical UI updates.
  // If interpretation fails, the entire transaction aborts to preserve append atomicity, chain correctness, and replay safety.
  private static async interpretSTA(tx: IDBTransaction, sta: STA): Promise<void> {
    if (sta.type === 'chat.append') {
      tx.objectStore('hsn_messages').add({ ...sta.payload, _from: sta.from, _to: sta.to, _ts: sta.timestamp, _nonce: sta.nonce });
    }
  }

  static async validateSTA(db: IDBDatabase, sta: STA, senderSignPublicKey: CryptoKey): Promise<boolean> {
    const { signature, ...rest } = sta;
    const data = canonicalize(rest);
    if (!(await this.verify(senderSignPublicKey, signature, data))) return false;

    const currentHead = await this.getChainHeadHash(db, rest.to);
    if (sta.prev_state_hash !== currentHead) return false;

    const lastTs = await this.getLastTimestamp(db);
    if (sta.timestamp <= lastTs) return false;

    if (await this.nonceExists(db, sta.nonce)) return false;
    return true;
  }

  static async getChainHeadHash(db: IDBDatabase, genesisSalt: string): Promise<string> {
    const store = db.transaction('hsn_state_chain', 'readonly').objectStore('hsn_state_chain');
    const chain: any[] = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result as any[]);
      req.onerror = () => rej(req.error);
    });
    if (chain.length === 0) return hashString('genesis:' + genesisSalt);
    const last = chain[chain.length - 1];
    return hashString(canonicalize(last));
  }

  private static async getLastTimestamp(db: IDBDatabase): Promise<number> {
    const store = db.transaction('hsn_state_chain', 'readonly').objectStore('hsn_state_chain');
    const chain: any[] = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result as any[]);
      req.onerror = () => rej(req.error);
    });
    return chain.length ? chain[chain.length - 1].timestamp : 0;
  }

  private static async nonceExists(db: IDBDatabase, nonce: string): Promise<boolean> {
    const store = db.transaction('hsn_sync_log', 'readonly').objectStore('hsn_sync_log');
    const result = await new Promise((res, rej) => {
      const req = store.get(nonce);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return !!result;
  }

  static async sign(privateKey: CryptoKey, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoder.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
  }

  static async verify(publicKey: CryptoKey, signature: string, data: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, sigBytes, encoder.encode(data));
  }
}
