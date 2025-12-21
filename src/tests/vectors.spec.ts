import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { Storage } from '../core/storage';
import { Identity } from '../core/identity';
import { State } from '../core/state';

describe('Determinism Gates', () => {
  it('Appends a valid STA deterministically (single runtime)', async () => {
    const db = await Storage.initDB();
    const hik = await Identity.initHIK(db);

    const sta = await State.createSTA(db, hik, 'chat.append', hik.hikHash, { text: 'hello', meta: { a: 1, b: 2 } });

    const appended = await State.appendSTA(db, sta, hik.signPublicKey);
    expect(appended).toBe(true);

    const head1 = await State.getChainHeadHash(db, hik.hikHash);
    const head2 = await State.getChainHeadHash(db, hik.hikHash);
    expect(head1).toBe(head2);
  });
});
