import type { HRD } from './signal';

export class DirectTransport {
  static async send(sta: any, toHrd: HRD, _signalClient: any): Promise<boolean> {
    if (!toHrd?.reachability?.direct?.webrtc) return false;

    return new Promise<boolean>((resolve) => {
      const pc = new RTCPeerConnection();
      const channel = pc.createDataChannel('sta');

      channel.onopen = () => {
        channel.send(JSON.stringify(sta));
        channel.close();
        pc.close();
        resolve(true);
      };
      channel.onerror = () => {
        try { pc.close(); } catch {}
        resolve(false);
      };

      setTimeout(() => {
        try { pc.close(); } catch {}
        resolve(false);
      }, 5000);
    });
  }
}
