# SECURITY

## Service Worker guardrail
Service Worker may retry transport only. It must never validate/append/mutate state.

## Why servers cannot read state
Payloads are end-to-end encrypted for transit delivery. Servers are disposable and non-authoritative.

## Replay protection
Nonces are unique per chain and recorded in `hsn_sync_log`. Replayed STAs are rejected.

## Known limitations
- Forward secrecy not implemented in this scaffold.
- Device loss requires user-managed encrypted export.
- iOS background constraints affect delivery liveness.
