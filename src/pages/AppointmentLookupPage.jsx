import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Input from '../components/Input';
import Button from '../components/Button';

const STATUS_LABELS = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandi',
  rejected: 'Reddedildi',
  cancelled_by_customer: 'Musteri Iptal',
  cancelled_by_shop: 'Dukkan Iptal',
  expired: 'Suresi Doldu',
  completed: 'Tamamlandi',
  no_show: 'Gelmedi',
};

const STATUS_COLORS = {
  pending: 'bg-amber-500 text-white ring-2 ring-amber-200 dark:bg-amber-400 dark:text-zinc-900 dark:ring-amber-700/40',
  confirmed: 'bg-emerald-600 text-white ring-2 ring-emerald-200 dark:bg-emerald-400 dark:text-zinc-900 dark:ring-emerald-700/40',
  rejected: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300',
  cancelled_by_customer: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300',
  cancelled_by_shop: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300',
  expired: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  no_show: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
};

const STATUS_CARD_COLORS = {
  pending: 'border-amber-300 bg-amber-50/80 dark:border-amber-700/60 dark:bg-amber-950/20',
  confirmed: 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-700/60 dark:bg-emerald-950/20',
};

const STATUS_DOT_COLORS = {
  pending: 'bg-amber-100 dark:bg-amber-900 animate-pulse',
  confirmed: 'bg-emerald-100 dark:bg-emerald-900',
};

function normalizePhone(rawPhone) {
  if (!rawPhone) return null;

  const raw = String(rawPhone).trim();
  if (/^\+90\d{10}$/.test(raw)) return raw;

  const digits = raw.replace(/\D/g, '');
  let local = digits;

  if (local.startsWith('90') && local.length === 12) {
    local = local.slice(2);
  }

  if (local.startsWith('0') && local.length === 11) {
    local = local.slice(1);
  }

  if (local.length !== 10) return null;

  return `+90${local}`;
}

const formatDate = (iso) => new Date(iso).toLocaleDateString('tr-TR', {
  weekday: 'short',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const formatTime = (iso) => new Date(iso).toLocaleTimeString('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
});

const getVisualStatus = (appointment) => {
  const isPastConfirmed = appointment.status === 'confirmed' && new Date(appointment.endsAt).getTime() < Date.now();
  return isPastConfirmed ? 'confirmed_past' : appointment.status;
};

const AppointmentLookupPage = () => {
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [searchedPhone, setSearchedPhone] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setError('Gecerli telefon numarasi giriniz. Ornek: 05XXXXXXXXX');
      setSearched(false);
      setAppointments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/appointments/query-by-phone', { phone: normalizedPhone });
      setAppointments(res.data.appointments || []);
      setSearchedPhone(res.data.phone || normalizedPhone);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Sorgu yapilirken bir hata olustu.');
      setSearched(false);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 min-h-screen shadow-2xl flex flex-col animate-fadeIn text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="bg-zinc-900 text-white p-8">
        <button
          onClick={() => navigate('/')}
          className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-1 hover:text-white transition-colors"
        >
          ← Geri
        </button>
        <h1 className="text-2xl font-black uppercase tracking-tighter italic">Randevu Sorgula</h1>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Telefon numaranizla randevularinizi goruntuleyin</p>
      </div>

      <div className="p-6 flex-1 bg-zinc-50 dark:bg-zinc-900 transition-colors overflow-y-auto">
        <div className="mb-4">
          <Input
            label="Telefon Numarasi"
            placeholder="05XXXXXXXXX veya +905XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
            Son randevularinizi gormek icin rezervasyonda kullandiginiz numarayi girin.
          </p>
        </div>

        <Button onClick={handleSearch} loading={loading}>
          Randevulari Sorgula
        </Button>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-200 p-4 text-sm font-bold">
            {error}
          </div>
        )}

        {searched && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-widest">Sonuclar</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {searchedPhone}
              </span>
            </div>

            {appointments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 p-6 text-center">
                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-300">Bu numaraya ait randevu bulunamadi.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => {
                  const visualStatus = getVisualStatus(appointment);

                  return (
                  <div
                    key={appointment.id}
                    className={`w-full text-left p-4 border rounded-2xl transition-all duration-200 border-zinc-100 bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${STATUS_CARD_COLORS[visualStatus] || ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black uppercase tracking-wide">{appointment.serviceName || 'Randevu'}</p>
                        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">
                          {appointment.shopName || 'Dukkan'}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[visualStatus] || 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                        {(visualStatus === 'pending' || visualStatus === 'confirmed') && (
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[visualStatus] || 'bg-white'}`}></span>
                        )}
                        {STATUS_LABELS[appointment.status] || appointment.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Tarih</p>
                        <p className="font-bold mt-1">{formatDate(appointment.startsAt)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Saat</p>
                        <p className="font-bold mt-1">{formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Personel</p>
                        <p className="font-bold mt-1">{appointment.staffName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Sure</p>
                        <p className="font-bold mt-1">{appointment.durationMin ? `${appointment.durationMin} dk` : '-'}</p>
                      </div>
                    </div>

                    {appointment.shopPhone && (
                      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-700">
                        <a
                          href={`tel:${appointment.shopPhone}`}
                          className="text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white"
                        >
                          Dukkani Ara: {appointment.shopPhone}
                        </a>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentLookupPage;
