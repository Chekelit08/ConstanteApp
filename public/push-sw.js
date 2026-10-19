// Notificaciones push de NORTE (se importa dentro del service worker generado por Workbox)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'NORTE', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'NORTE', {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || undefined,
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'norte-open', url });
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
