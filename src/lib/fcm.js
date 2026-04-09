import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { firebaseConfig, getFirebaseApp, getMissingFirebaseConfigKeys, hasFirebaseConfig } from './firebase';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const safariStandalone = window.navigator?.standalone === true;
  return Boolean(mediaStandalone || safariStandalone);
}

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
  if (!window.isSecureContext) return false;

  return isSupported();
}

export async function setupFcmForCurrentDevice(options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  if (!hasFirebaseConfig || !vapidKey) {
    const missingKeys = getMissingFirebaseConfigKeys();
    if (!vapidKey) missingKeys.push('VITE_FIREBASE_VAPID_KEY');
    return { ok: false, reason: 'missing_config', missingKeys };
  }
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported_or_missing_config' };
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported_or_missing_config' };
  }
  if (!window.isSecureContext) {
    return { ok: false, reason: 'insecure_context' };
  }
  if (isIosDevice() && !isStandaloneMode()) {
    return { ok: false, reason: 'ios_requires_standalone' };
  }

  const supported = await isSupported();
  if (!supported) return { ok: false, reason: 'unsupported_or_missing_config' };

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

  if (forceRefresh) {
    try {
      await deleteToken(messaging);
    } catch (err) {
      console.error('FCM token yenileme oncesi silinemedi:', err.message);
    }
  }

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
