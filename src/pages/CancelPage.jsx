import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import Button from '../components/Button';

const CancelPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const token = searchParams.get('t');

  const [status, setStatus] = useState('idle'); // idle | loading | success | too_late | error
  const [shopPhone, setShopPhone] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!id || !token) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-5xl mb-6">🔗</div>
        <h1 className="text-xl font-black uppercase tracking-tight text-center mb-2">Geçersiz Link</h1>
        <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest text-center">Bu iptal linki geçersiz veya eksik.</p>
      </div>
    );
  }

  const handleCancel = async () => {
    setStatus('loading');
    try {
      await api.post(`/appointments/${id}/cancel`, { token });
      setStatus('success');
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'too_late') {
        setShopPhone(data.shopPhone);
        setStatus('too_late');
      } else if (data?.error?.includes('invalid_status')) {
        setErrorMessage('Bu randevu zaten iptal edilmiş veya tamamlanmış.');
        setStatus('error');
      } else if (data?.error === 'token_expired' || data?.error === 'invalid_token') {
        setErrorMessage('Bu iptal linki artık geçerli değil (süresi dolmuş).');
        setStatus('error');
      } else {
        setErrorMessage(data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
        setStatus('error');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl flex flex-col animate-fadeIn">
      <div className="bg-zinc-900 text-white p-8">
        <h1 className="text-2xl font-black uppercase tracking-tighter italic">Randevu İptali</h1>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Barberos</p>
      </div>

      <div className="p-8 flex-1 flex flex-col items-center justify-center">
        {status === 'idle' && (
          <div className="w-full animate-fadeIn">
            <div className="text-5xl text-center mb-6">📅</div>
            <h2 className="text-xl font-black uppercase tracking-tight text-center mb-3">Randevuyu İptal Et</h2>
            <p className="text-sm text-zinc-400 font-bold text-center mb-8 uppercase tracking-widest leading-relaxed">
              Randevunuzu iptal etmek istediğinizden emin misiniz?
            </p>
            <Button variant="danger" onClick={handleCancel}>
              Evet, İptal Et
            </Button>
            <p className="text-xs text-zinc-400 text-center mt-4 font-bold uppercase tracking-widest">
              İptal sonrası geri alınamaz.
            </p>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <div className="animate-spin h-10 w-10 border-4 border-zinc-900 border-t-transparent rounded-full"></div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">İşleniyor...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center animate-fadeIn">
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3">İptal Edildi</h2>
            <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
              Randevunuz başarıyla iptal edildi.<br />Berbere bilgi SMS'i gönderildi.
            </p>
          </div>
        )}

        {status === 'too_late' && (
          <div className="text-center animate-fadeIn">
            <div className="text-6xl mb-6">⏰</div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3">İptal Edilemez</h2>
            <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest leading-relaxed mb-6">
              Randevuya 2 saatten az kaldığı için<br />online iptal yapılamaz.
            </p>
            {shopPhone && (
              <a
                href={`tel:${shopPhone}`}
                className="inline-block bg-zinc-900 text-white font-black uppercase tracking-widest text-sm px-6 py-4 rounded-2xl transition-all active:scale-95"
              >
                Berberi Ara: {shopPhone}
              </a>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="text-center animate-fadeIn">
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Hata</h2>
            <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
              {errorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CancelPage;
