/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

function getConfigFromUrl() {
  var params = new URL(self.location.href).searchParams;

  return {
    apiKey: params.get('apiKey') || '',
    authDomain: params.get('authDomain') || '',
    projectId: params.get('projectId') || '',
    storageBucket: params.get('storageBucket') || '',
    messagingSenderId: params.get('messagingSenderId') || '',
    appId: params.get('appId') || '',
  };
}

function hasRequiredConfig(config) {
  return !!(config.apiKey && config.projectId && config.messagingSenderId && config.appId);
}

var config = getConfigFromUrl();

if (hasRequiredConfig(config)) {
  firebase.initializeApp(config);

  var messaging = firebase.messaging();
  messaging.onBackgroundMessage(function (payload) {
    var notificationTitle = (payload.notification && payload.notification.title) || 'ReservOS';
    var notificationBody = (payload.notification && payload.notification.body) || 'Yeni bildirim var.';

    self.registration.showNotification(notificationTitle, {
      body: notificationBody,
      icon: '/icon-192.svg',
      data: payload.data || {},
    });
  });
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i += 1) {
        var client = windowClients[i];
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) return clients.openWindow(targetUrl);
      return null;
    })
  );
});
