/* eslint-disable no-restricted-globals */

// Service Worker para Notificações Push - Pink Music
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener para receber mensagens push em segundo plano (mesmo com navegador/dashboard fechado)
self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { notification: { title: "Pink Music", body: event.data.text() } };
  }

  const notificationTitle =
    data.notification?.title || data.data?.title || "🛒 Nova venda confirmada!";

  const notificationOptions = {
    body:
      data.notification?.body ||
      data.data?.body ||
      "Um novo pedido teve o pagamento aprovado.",
    icon: data.notification?.icon || "/img/pinkmusic-logo.png",
    badge: data.notification?.badge || "/img/pinkmusic-logo.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: data.notification?.tag || (data.data?.orderId ? `order-${data.data.orderId}` : "pink-music-push"),
    renotify: true,
    data: {
      url: data.data?.url || data.fcmOptions?.link || "/dashboard/orders",
      orderId: data.data?.orderId,
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Ao clicar na notificação, foca na aba existente ou abre uma nova
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard/orders";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Se já houver uma aba aberta do dashboard, foca nela e navega se necessário
        for (const client of windowClients) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            client.focus();
            if ("navigate" in client && targetUrl) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
        // Se não houver aba aberta, abre uma nova
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
