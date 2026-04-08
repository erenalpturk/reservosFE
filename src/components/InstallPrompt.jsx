import { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed or previously dismissed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('pwa-dismissed')) return;

    // Android / Chrome — native install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari — no native prompt, show manual tip
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|chrome/i.test(navigator.userAgent);
    if (isIos && isSafari) {
      setShowIosTip(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosTip(false);
    sessionStorage.setItem('pwa-dismissed', '1');
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIosTip) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 animate-fadeIn">
      <div className="bg-zinc-900 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-widest">Ana Ekrana Ekle</p>
          {showIosTip ? (
            <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
              Safari'de <span className="inline-block align-middle text-sm">⎙</span> paylaş butonuna bas, sonra <strong>"Ana Ekrana Ekle"</strong> seç.
            </p>
          ) : (
            <p className="text-[10px] text-zinc-400 mt-1">Uygulama gibi kullan, hızlı eriş.</p>
          )}
        </div>
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-white text-zinc-900 text-xs font-black uppercase tracking-widest rounded-xl flex-shrink-0"
          >
            Ekle
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 text-lg leading-none"
          aria-label="Kapat"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
