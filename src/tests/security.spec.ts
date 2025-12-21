import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { Storage } from '../core/storage';
import { Identity } from '../core/identity';
import { State } from '../core/state';

describe('Security Gate: Replay Attack', () => {
  it('Rejects replayed STA (nonce reuse)', async () => {
    const db = await Storage.initDB();
    const hik = await Identity.initHIK(db);

    const sta = await State.createSTA(db, hik, 'chat.append', hik.hikHash, { text: 'test' });

    const first = await State.appendSTA(db, sta, hik.signPublicKey);
    expect(first).toBe(true);

    const replay = await State.appendSTA(db, sta, hik.signPublicKey);
    expect(replay).toBe(false);
  });
});
