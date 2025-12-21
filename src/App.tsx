import { useEffect, useState } from 'react';
import { Storage } from './core/storage';
import { Identity, type HIK } from './core/identity';
import { State, type STA } from './core/state';
import { SignalClient } from './transport/signal';
import { DirectTransport } from './transport/direct';
import { FallbackTransport } from './transport/fallback';
import { ChatView } from './ui/ChatView';
import { StatusBanner } from './ui/StatusBanner';

function envSignalNodes(): string[] {
  const raw = (import.meta.env.VITE_SIGNAL_NODES as string | undefined)?.trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function App() {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [hik, setHik] = useState<HIK | null>(null);
  const [signal, setSignal] = useState<SignalClient | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [transportReady, setTransportReady] = useState(false);

  useEffect(() => {
    (async () => {
      const db = await Storage.initDB();
      setDb(db);

      const hik = await Identity.initHIK(db);
      setHik(hik);

      const nodes = envSignalNodes();
      if (nodes.length > 0) setSignal(new SignalClient(hik.hikHash, nodes));

      setTransportReady(!!import.meta.env.VITE_TRANSIT_BASE || nodes.length > 0);

      try {
        if (import.meta.env.VITE_TRANSIT_BASE) await FallbackTransport.pollTransit(db, hik);
      } catch (e) {
        console.warn(String(e));
      }

      await updatePending(db);
    })();

    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));
  }, []);

  const updatePending = async (db: IDBDatabase) => {
    const tx = db.transaction('hsn_outbox', 'readonly');
    const count = await new Promise<number>((res) => {
      const req = tx.objectStore('hsn_outbox').count();
      req.onsuccess = () => res(req.result);
    });
    setPending(count);
  };

  const deleteFromOutbox = async (db: IDBDatabase, nonce: string) => {
    const tx = db.transaction('hsn_outbox', 'readwrite');
    tx.objectStore('hsn_outbox').delete(nonce);
    await new Promise<void>((res) => tx.oncomplete = () => res());
  };

  const sendSTA = async (to: string, text: string) => {
    if (!db || !hik) return;

    const sta = await State.createSTA(db, hik, 'chat.append', to, { text });

    // INVARIANT: Outbox is authoritative for intent, not delivery.
    const tx = db.transaction('hsn_outbox', 'readwrite');
    tx.objectStore('hsn_outbox').add(sta);
    await new Promise<void>((res) => tx.oncomplete = () => res());
    await updatePending(db);

    try {
      let success = false;

      if (signal) {
        const toHrd = await signal.queryHRD(to);
        if (toHrd) success = await DirectTransport.send(sta, toHrd, signal);

        if (!success && toHrd && import.meta.env.VITE_TRANSIT_BASE) {
          const senderSignPublicJwk = await crypto.subtle.exportKey('jwk', hik.signPublicKey);
          success = await FallbackTransport.sendToTransit(sta, toHrd, senderSignPublicJwk);
        }
      }

      if (success) {
        await deleteFromOutbox(db, sta.nonce);
        await updatePending(db);
      }
    } catch (e) {
      console.warn(String(e));
    }
  };

  return (
    <div>
      <StatusBanner online={online} pending={pending} transportReady={transportReady} />
      <ChatView sendSTA={sendSTA} db={db} />
      <div style={{ padding: 12, fontFamily: 'system-ui', fontSize: 12, opacity: 0.7 }}>
        HIK: {hik?.hikHash ?? '(initializing...)'}
      </div>
    </div>
  );
}

export default App;
