// SECURITY RULE:
// Service Worker may retry transport only.
// All state mutation MUST occur in the main HSN context.
// SW may read hsn_outbox but NEVER call validate/append/mutate.

import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
