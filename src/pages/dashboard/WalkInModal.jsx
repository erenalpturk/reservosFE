import React, { useState } from 'react';
import api from '../../lib/api';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';

const WalkInModal = ({ shop, currentUser, onClose, onSuccess, initialStartsAt }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    staffId: currentUser.isOwner ? '' : currentUser.staffId,
    startsAt: initialStartsAt || '',
    fullName: '',
    phone: '',
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState(() => {
    const defaultService = shop.services.find(
      s => s.is_active !== false && s.name?.trim() === 'Saç Kesimi'
    );
    return defaultService ? [defaultService.id] : [];
  });
  const [submitting, setSubmitting] = useState(false);

  const activeServices = shop.services.filter(s => s.is_active !== false);

  const selectedServicesData = activeServices.filter(s => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServicesData.reduce(
    (sum, s) => sum + (s.duration_min || 0) + (s.buffer_min || 0), 0
  );

  const computeEndsAt = (startsAt) => {
    if (!startsAt || totalDuration === 0) return null;
    const start = new Date(startsAt);
    return new Date(start.getTime() + totalDuration * 60 * 1000).toISOString();
  };

  const toggleService = (id) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedServiceIds.length === 0 || !form.startsAt || !form.fullName) {
      toast('Hizmet, saat ve ad zorunludur.');
      return;
    }
    const endsAt = computeEndsAt(form.startsAt);
    if (!endsAt) return;

    setSubmitting(true);
    try {
      await api.post('/appointments/walk-in', {
        staffId: form.staffId || undefined,
        serviceIds: selectedServiceIds,
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

  const activeStaff = shop.staff.filter(b => b.is_active !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] shadow-2xl animate-fadeIn text-zinc-900 dark:text-zinc-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Walk-In Ekle</h2>
          <button onClick={onClose} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 font-black text-xl leading-none">✕</button>
        </div>

        <div className="space-y-4">
          {/* Personel seçimi (sadece sahip için) */}
          {currentUser.isOwner && (
            <div>
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1">Personel</label>
              <select
                value={form.staffId}
                onChange={e => setForm({ ...form, staffId: e.target.value })}
                className="w-full p-4 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none text-sm font-bold"
              >
                <option value={currentUser.staffId}>{currentUser.fullName}</option>
                {activeStaff.map(b => (
                  <option key={b.id} value={b.id}>{b.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Hizmet (çoklu seçim) */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1">
              Hizmet <span className="normal-case font-normal text-zinc-300 dark:text-zinc-400">(birden fazla seçilebilir)</span>
            </label>
            <div className="space-y-2">
              {activeServices.map(s => {
                const isSelected = selectedServiceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    className={`w-full flex justify-between items-center p-3 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-white bg-white dark:border-zinc-900 dark:bg-zinc-900' : 'border-zinc-300 dark:border-zinc-600'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-sm bg-zinc-900 dark:bg-white" />}
                      </div>
                      <span className="font-bold text-sm">{s.name}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isSelected ? 'bg-zinc-700 text-white dark:bg-zinc-800 dark:text-zinc-100' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-300'}`}>{s.duration_min} dk</span>
                  </button>
                );
              })}
            </div>
            {selectedServiceIds.length > 1 && (
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-2 ml-1">
                Toplam: {totalDuration} dk
              </p>
            )}
          </div>

          {/* Başlangıç tarihi/saati */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1">Başlangıç</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={e => setForm({ ...form, startsAt: e.target.value })}
              className="w-full p-4 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none text-sm font-bold"
            />
            {selectedServiceIds.length > 0 && form.startsAt && computeEndsAt(form.startsAt) && (
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1 ml-1">
                Bitiş: {new Date(computeEndsAt(form.startsAt)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Ad Soyad */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1">Ad Soyad</label>
            <input
              type="text"
              placeholder="Ahmet Yılmaz"
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              className="w-full p-4 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none text-sm font-bold"
            />
          </div>

          {/* Telefon (opsiyonel) */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1">
              Telefon <span className="normal-case font-normal text-zinc-300 dark:text-zinc-400">(opsiyonel)</span>
            </label>
            <input
              type="tel"
              placeholder="05XXXXXXXXX"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full p-4 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none text-sm font-bold"
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
