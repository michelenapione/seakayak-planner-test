const CACHE_NAME = 'akc-kayak-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192-v3.png',
  '/icon-512-v3.png'
];

// Installa il service worker e cachea i file
self.addEventListener('install', event => {
  console.log('[SW] Installazione in corso...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache dei file in corso');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Installazione completata');
        return self.skipWaiting();
      })
  );
});

// Attiva il service worker e pulisci vecchie cache
self.addEventListener('activate', event => {
  console.log('[SW] Attivazione in corso...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Cancellazione vecchia cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Attivazione completata');
      return self.clients.claim();
    })
  );
});

// Gestione delle richieste di rete (cache first)
self.addEventListener('fetch', event => {
  // Ignora richieste non-GET e analytics
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('google-analytics')) return;
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - restituisci dalla cache
        if (response) {
          return response;
        }
        
        // Clona la richiesta originale
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Verifica risposta valida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clona la risposta per cache e browser
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            // Non cacheare richieste ai tile delle mappe (sono troppi e già in IndexedDB)
            if (!event.request.url.includes('tile.openstreetmap.org')) {
              cache.put(event.request, responseToCache);
            }
          });
          
          return response;
        }).catch(() => {
          // Offline fallback per la pagina principale
          if (event.request.url.includes('/index.html') || event.request.url === '/' || event.request.url.endsWith('/')) {
            return caches.match('/index.html');
          }
          
          // Per altri file, restituisci un errore
          return new Response('Offline - Contenuto non disponibile', {
            status: 503,
            statusText: 'Offline'
          });
        });
      })
  );
});