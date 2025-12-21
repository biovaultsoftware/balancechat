export function MessageItem({ msg }: { msg: any }) {
  return (
    <div style={{ padding: 6, margin: '6px 0', border: '1px solid #eee', borderRadius: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{msg._from} → {msg._to}</div>
      <div>{msg.text}</div>
    </div>
  );
}
