export type HRD = {
  hik: string;
  signPublicJwk: JsonWebKey;
  dhPublicJwk: JsonWebKey;
  reachability?: {
    direct?: { webrtc?: boolean };
    fallback?: { transit_gateway: string; ttl_seconds: number };
  };
};

export class SignalClient {
  private ws: WebSocket[] = [];
  private hrdCallbacks = new Map<string, (hrd: HRD | null) => void>();

  constructor(private myHik: string, nodes: string[]) {
    nodes.forEach((url) => {
      const ws = new WebSocket(`${url}?hik=${encodeURIComponent(myHik)}`);
      ws.onmessage = (ev) => this.handleMessage(ev);
      this.ws.push(ws);
    });
  }

  sendSignal(targetHik: string, data: any) {
    const msg = JSON.stringify({ type: 'signal', target: targetHik, data });
    this.ws.forEach((ws) => ws.readyState === WebSocket.OPEN && ws.send(msg));
  }

  publishHRD(hrd: HRD) {
    const msg = JSON.stringify({ type: 'publish_hrd', data: hrd });
    this.ws.forEach((ws) => ws.readyState === WebSocket.OPEN && ws.send(msg));
  }

  queryHRD(targetHik: string): Promise<HRD | null> {
    const id = crypto.randomUUID();
    return new Promise((resolve) => {
      this.hrdCallbacks.set(id, resolve);
      const msg = JSON.stringify({ type: 'query_hrd', target: targetHik, id });
      this.ws.forEach((ws) => ws.readyState === WebSocket.OPEN && ws.send(msg));
      setTimeout(() => {
        if (this.hrdCallbacks.has(id)) {
          this.hrdCallbacks.delete(id);
          resolve(null);
        }
      }, 4000);
    });
  }

  private handleMessage(ev: MessageEvent) {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'hrd_response' && this.hrdCallbacks.has(msg.id)) {
      const cb = this.hrdCallbacks.get(msg.id)!;
      this.hrdCallbacks.delete(msg.id);
      cb(msg.data ?? null);
    }
  }
}
