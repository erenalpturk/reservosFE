import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { firebaseConfig, getFirebaseApp, hasFirebaseConfig } from './firebase';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function buildServiceWorkerUrl() {
  const params = new URLSearchParams();

  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return `/firebase-messaging-sw.js?${params.toString()}`;
}

export async function canUseFcm() {
  if (!hasFirebaseConfig || !vapidKey) return false;
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;

  return isSupported();
}

export async function setupFcmForCurrentDevice() {
  const canUse = await canUseFcm();
  if (!canUse) return { ok: false, reason: 'unsupported_or_missing_config' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission_denied' };
  }

  const app = getFirebaseApp();
  if (!app) return { ok: false, reason: 'missing_firebase_config' };

  const swRegistration = await navigator.serviceWorker.register(buildServiceWorkerUrl(), {
    scope: '/firebase-cloud-messaging-push-scope',
  });
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swRegistration,
  });

  if (!token) return { ok: false, reason: 'token_empty' };
  return { ok: true, token };
}

export async function subscribeForegroundMessages(callback) {
  const canUse = await canUseFcm();
  if (!canUse) return () => {};

  const app = getFirebaseApp();
  if (!app) return () => {};

  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}
