import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';

const WalkInModal = ({ shop, currentUser, onClose, onSuccess, initialStartsAt }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    barberId: currentUser.isOwner ? '' : currentUser.barberId,
    serviceId:
      shop.services.find(s => s.is_active !== false && s.name?.trim() === 'Saç Kesimi')?.id || '',
    startsAt: initialStartsAt || '',
    fullName: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (form.serviceId) return;

    const defaultService = shop.services.find(
      s => s.is_active !== false && s.name?.trim() === 'Saç Kesimi'
    );

    if (defaultService?.id) {
      setForm(prev => ({ ...prev, serviceId: defaultService.id }));
    }
  }, [form.serviceId, shop.services]);

  const selectedService = shop.services.find(s => s.id === form.serviceId);

  const computeEndsAt = (startsAt, service) => {
    if (!startsAt || !service) return null;
    const start = new Date(startsAt);
    const durationMs = (service.duration_min + (service.buffer_min || 0)) * 60 * 1000;
    return new Date(start.getTime() + durationMs).toISOString();
  };

  const handleSubmit = async () => {
    if (!form.serviceId || !form.startsAt || !form.fullName) {
      toast('Hizmet, saat ve ad zorunludur.');
      return;
    }
    const endsAt = computeEndsAt(form.startsAt, selectedService);
    if (!endsAt) return;

    setSubmitting(true);
    try {
      await api.post('/appointments/walk-in', {
        barberId: form.barberId || undefined,
        serviceId: form.serviceId,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt,
        fullName: form.fullName,
        phone: form.phone || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Walk-in eklenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeBarbers = shop.barbers.filter(b => b.is_active !== false);
  const activeServices = shop.services.filter(s => s.is_active !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 shadow-2xl animate-fadeIn">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Walk-In Ekle</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 font-black text-xl leading-none">✕</button>
        </div>

        <div className="space-y-4">
          {/* Berber seçimi (sadece sahip için) */}
          {currentUser.isOwner && (
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Berber</label>
              <select
                value={form.barberId}
                onChange={e => setForm({ ...form, barberId: e.target.value })}
                className="w-full p-4 border-2 border-zinc-100 rounded-2xl bg-white focus:border-zinc-900 focus:outline-none text-sm font-bold"
              >
                <option value={currentUser.barberId}>{currentUser.fullName}</option>
                {activeBarbers.map(b => (
                  <option key={b.id} value={b.id}>{b.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Hizmet */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Hizmet</label>
            <select
              value={form.serviceId}
              onChange={e => setForm({ ...form, serviceId: e.target.value })}
              className="w-full p-4 border-2 border-zinc-100 rounded-2xl bg-white focus:border-zinc-900 focus:outline-none text-sm font-bold"
            >
              <option value="">{activeServices[0]?.name || 'Hizmet seçin'}</option>
              {activeServices.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.duration_min} dk)</option>
              ))}
            </select>
          </div>

          {/* Başlangıç tarihi/saati */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Başlangıç</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={e => setForm({ ...form, startsAt: e.target.value })}
              className="w-full p-4 border-2 border-zinc-100 rounded-2xl bg-white focus:border-zinc-900 focus:outline-none text-sm font-bold"
            />
            {selectedService && form.startsAt && (
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1 ml-1">
                Bitiş: {new Date(computeEndsAt(form.startsAt, selectedService)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Ad Soyad */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Ad Soyad</label>
            <input
              type="text"
              placeholder="Ahmet Yılmaz"
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              className="w-full p-4 border-2 border-zinc-100 rounded-2xl bg-white focus:border-zinc-900 focus:outline-none text-sm font-bold"
            />
          </div>

          {/* Telefon (opsiyonel) */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">
              Telefon <span className="normal-case font-normal text-zinc-300">(opsiyonel)</span>
            </label>
            <input
              type="tel"
              placeholder="05XXXXXXXXX"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full p-4 border-2 border-zinc-100 rounded-2xl bg-white focus:border-zinc-900 focus:outline-none text-sm font-bold"
            />
          </div>

          <Button onClick={handleSubmit} loading={submitting}>
            Ekle
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WalkInModal;
