import type { HRD } from './signal';
import { State } from '../core/state';

function mustTransitBase(): string {
  const base = import.meta.env.VITE_TRANSIT_BASE as string | undefined;
  if (!base) throw new Error('Transit base not configured. Set VITE_TRANSIT_BASE.');
  return base.replace(/\/$/, '');
}

export class FallbackTransport {
  static async pollTransit(db: IDBDatabase, hik: any): Promise<void> {
    const base = mustTransitBase();
    const res = await fetch(`${base}/poll?hik=${encodeURIComponent(hik.hikHash)}`);
    if (!res.ok) return;
    const envelopes = await res.json();

    for (const env of envelopes) {
      const sta = env.sta;
      const senderSignPublicJwk = env.senderSignPublicJwk;
      const senderSignPublicKey = await crypto.subtle.importKey('jwk', senderSignPublicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);

      const appended = await State.appendSTA(db, sta, senderSignPublicKey);
      if (appended) {
        await fetch(`${base}/delete?hik=${encodeURIComponent(hik.hikHash)}&id=${encodeURIComponent(env.id)}`, { method: 'DELETE' });
      }
    }
  }

  static async sendToTransit(sta: any, toHrd: HRD, senderSignPublicJwk: JsonWebKey): Promise<boolean> {
    const base = mustTransitBase();
    const transit = (toHrd?.reachability?.fallback?.transit_gateway || base).replace(/\/$/, '');
    const ttl = toHrd?.reachability?.fallback?.ttl_seconds ?? 300;

    const res = await fetch(`${transit}/upload?hik=${encodeURIComponent(sta.to)}&ttl=${ttl}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sta, senderSignPublicJwk })
    });
    return res.ok;
  }
}
