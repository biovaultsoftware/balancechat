export function StatusBanner({ online, pending, transportReady }: { online: boolean; pending: number; transportReady: boolean }) {
  return (
    <div style={{ padding: 8, borderBottom: '1px solid #ddd', fontFamily: 'system-ui' }}>
      <strong>{online ? 'Online' : 'Offline'}</strong>
      {' '}| Pending: {pending}
      {' '}| Transport: {transportReady ? 'Configured' : 'Not configured'}
    </div>
  );
}
