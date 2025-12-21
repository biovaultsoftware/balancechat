import { useEffect, useState } from 'react';
import { MessageItem } from './MessageItem';

export function ChatView({ sendSTA, db }: { sendSTA: (to: string, text: string) => void; db: IDBDatabase | null }) {
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  const refresh = () => {
    if (!db) return;
    const tx = db.transaction('hsn_messages', 'readonly');
    const req = tx.objectStore('hsn_messages').getAll();
    req.onsuccess = () => setMessages(req.result as any[]);
  };

  useEffect(() => { refresh(); }, [db]);

  const handleSend = () => {
    if (!to || !text) return;
    sendSTA(to, text);
    setText('');
    setTimeout(refresh, 50);
  };

  return (
    <div style={{ padding: 12, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ flex: 1 }} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient HIK hash" />
        <input style={{ flex: 2 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Text" />
        <button onClick={handleSend}>Send</button>
      </div>

      <div style={{ marginTop: 12 }}>
        {messages.map((msg, i) => <MessageItem key={i} msg={msg} />)}
      </div>
    </div>
  );
}
