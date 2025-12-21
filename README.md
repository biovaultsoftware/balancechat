# BalanceChain PWA

BalanceChain is a human-bound, device-resident state system: authoritative state lives on the user device (IndexedDB), while networks are disposable delivery aids.

This repository is a production-ready PWA scaffold (protocol invariants locked, hardening v1.1 applied).

## Local install
```bash
npm install
npm run dev
```

## Tests
```bash
npm test
```

## Build
```bash
npm run build
npm run preview
```

## Offline behavior
The app functions offline; state persists in IndexedDB. Delivery may delay, but correctness is preserved.

## iOS limitations
Background WebRTC is limited; fallback to transit is expected. Delivery reliability is probabilistic; state correctness is deterministic.

## Transport configuration
Set these environment variables at build/deploy time:
- `VITE_SIGNAL_NODES` (comma-separated wss://... endpoints)
- `VITE_TRANSIT_BASE` (https://... base URL for transit cache)

If not configured, transport will fail loudly (no silent no-ops).
