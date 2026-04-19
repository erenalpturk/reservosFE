import { useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { subscribeForegroundMessages, setupFcmForCurrentDevice } from '../lib/fcm';
import { useToast } from './Toast';

const REGISTERED_TOKEN_KEY = 'fcm:registered-token';

async function showForegroundSystemNotification(payload) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

  const title = payload?.data?.title || payload?.notification?.title || 'Yeni bildirim';
  const body = payload?.data?.body || payload?.notification?.body || '';
  const data = payload?.data || {};
  const options = {
    body,
    icon: '/icon-192.svg',
    data,
  };

  try {
    const reg = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
      return;
    }
  } catch (err) {
    console.error('Foreground notification hatasi:', err.message);
  }

  // Fallback for browsers where worker registration lookup fails.
  new Notification(title, options);
}

const FcmManager = () => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const toast = useToast();
  const recentMessageKeysRef = useRef(new Map());

  const isDuplicateMessage = (payload) => {
    const title = payload?.data?.title || payload?.notification?.title || '';
    const body = payload?.data?.body || payload?.notification?.body || '';
    const type = payload?.data?.type || '';
    const appointmentId = payload?.data?.appointmentId || '';
    const messageId = payload?.messageId || payload?.data?.messageId || '';
    const key = messageId || `${type}|${appointmentId}|${title}|${body}`;
    if (!key) return false;

    const now = Date.now();
    const lastSeen = recentMessageKeysRef.current.get(key);
    recentMessageKeysRef.current.set(key, now);

    // Keep map bounded and clear stale keys.
    for (const [k, ts] of recentMessageKeysRef.current.entries()) {
      if (now - ts > 30000) recentMessageKeysRef.current.delete(k);
    }

    return typeof lastSeen === 'number' && now - lastSeen < 10000;
  };

  useEffect(() => {
    if (!token || !user?.role || !['owner', 'employee'].includes(user.role)) return;

    let cancelled = false;
    let unsub = null;

    (async () => {
      const foregroundUnsub = await subscribeForegroundMessages((payload) => {
        if (cancelled) return;
        if (isDuplicateMessage(payload)) return;

        const title = payload?.data?.title || payload?.notification?.title || 'Yeni bildirim';
        const body = payload?.data?.body || payload?.notification?.body;
        const text = body ? `${title}: ${body}` : title;
        // When app is visible, toast is enough; avoid a second system popup.
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          showForegroundSystemNotification(payload);
        }
        toast(text, 'info');
      });

      if (cancelled) {
        if (typeof foregroundUnsub === 'function') foregroundUnsub();
        return;
      }

      unsub = foregroundUnsub;
    })();

    return () => {
      cancelled = true;
      if (typeof unsub === 'function') unsub();
    };
  }, [token, user?.role, toast]);

  useEffect(() => {
    if (!token || !user?.role || !['owner', 'employee'].includes(user.role)) return;

    let cancelled = false;

    const register = async () => {
      try {
        const result = await setupFcmForCurrentDevice();
        if (!result.ok || cancelled) return;

        await api.post('/notifications/fcm-token', {
          token: result.token,
          platform: 'web',
        });

        localStorage.setItem(REGISTERED_TOKEN_KEY, result.token);
      } catch (err) {
        console.error('FCM kayit hatasi:', err.message);
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id, user?.role]);

  return null;
};

export default FcmManager;
