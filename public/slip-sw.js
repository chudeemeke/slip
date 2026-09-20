/* Slip lock-screen nudge worker. No board data lives here. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let title = "Slip";
  let body = "A card is still here.";
  try {
    const data = event.data ? event.data.json() : null;
    if (data && typeof data.title === "string" && data.title.trim()) title = data.title.trim().slice(0, 40);
    if (data && typeof data.body === "string" && data.body.trim()) body = data.body.trim().slice(0, 80);
  } catch {
    /* use defaults */
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "slip-nudge",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
      return undefined;
    }),
  );
});
