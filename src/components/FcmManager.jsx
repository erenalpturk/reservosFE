import { useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { subscribeForegroundMessages, setupFcmForCurrentDevice } from '../lib/fcm';
import { useToast } from './Toast';

const REGISTERED_TOKEN_KEY = 'fcm:registered-token';

const FcmManager = () => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const toast = useToast();

  useEffect(() => {
    if (!token || !user?.role || !['owner', 'employee'].includes(user.role)) return;

    let unsub = () => {};
    let cancelled = false;

    const initForeground = async () => {
      unsub = await subscribeForegroundMessages((payload) => {
        if (cancelled) return;
        const title = payload?.notification?.title || 'Yeni bildirim';
        const body = payload?.notification?.body;
        const text = body ? `${title}: ${body}` : title;
        toast(text, 'info');
      });
    };

    initForeground();

    return () => {
      cancelled = true;
      if (typeof unsub === 'function') unsub();
    };
  }, [token, user?.role, toast]);

  useEffect(() => {
    if (!token || !user?.role || !['owner', 'employee'].includes(user.role)) return;

    let cancelled = false;

    const register = async () => {
      const alreadyRegistered = localStorage.getItem(REGISTERED_TOKEN_KEY);

      try {
        const result = await setupFcmForCurrentDevice();
        if (!result.ok || cancelled) return;

        if (alreadyRegistered === result.token) return;

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
