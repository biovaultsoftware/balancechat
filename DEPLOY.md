# DEPLOY

## Frontend (Static Hosting)
Deploy `dist/` to Vercel / Cloudflare Pages / S3.

Required env vars:
- `VITE_SIGNAL_NODES`
- `VITE_TRANSIT_BASE`

## Signal Fabric (stateless)
- Deploy 5-10 nodes across regions/providers
- No shared storage
- DO NOT place behind sticky load balancer
- DO NOT share memory between nodes
- Redundancy ≠ distribution (nodes are independent)

## Transit Cache
- Separate service from Signal Fabric
- Short TTL, no indexes, no backups
