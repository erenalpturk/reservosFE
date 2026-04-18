import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../lib/api';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';

const LAST_SERVICE_IDS_KEY_PREFIX = 'dashboard:walkin:last-services';
const WALK_IN_STEP_MINUTES = 5;
const QUICK_TIME_PRESETS = [
  { label: '+5 dk', minutes: 5 },
  { label: '+10 dk', minutes: 10 },
  { label: '+15 dk', minutes: 15 },
];

const toDateTimeLocalValue = (date) => {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toDateInputValue = (date) => toDateTimeLocalValue(date).slice(0, 10);
const toTimeInputValue = (date) => toDateTimeLocalValue(date).slice(11, 16);

const splitDateTimeLocalValue = (value) => {
  if (!value || typeof value !== 'string') return { date: '', time: '' };
  const [date = '', time = ''] = value.split('T');
  return { date, time: time.slice(0, 5) };
};

const buildDateTimeLocalFromParts = (date, time) => {
  if (!date || !time) return '';
  return `${date}T${time}`;
};

const roundToNextStepMinute = (inputDate, stepMinutes = WALK_IN_STEP_MINUTES) => {
  const date = new Date(inputDate);
  date.setSeconds(0, 0);
  const minutes = date.getMinutes();
  const remainder = minutes % stepMinutes;
  if (remainder !== 0) {
    date.setMinutes(minutes + (stepMinutes - remainder));
  }
  return date;
};

const getDefaultStartsAt = (initialStartsAt) => {
  if (initialStartsAt) return initialStartsAt;
  return toDateTimeLocalValue(roundToNextStepMinute(new Date()));
};

const WalkInModal = ({ shop, currentUser, onClose, onSuccess, initialStartsAt }) => {
  const toast = useToast();
  const phoneInputRef = useRef(null);

  const activeServices = useMemo(
    () => (shop.services || []).filter(s => s.is_active !== false),
    [shop.services]
  );
  const activeStaff = useMemo(
    () => (shop.staff || []).filter(b => b.is_active !== false),
    [shop.staff]
  );
  const serviceStorageKey = useMemo(
    () => `${LAST_SERVICE_IDS_KEY_PREFIX}:${shop.id}`,
    [shop.id]
  );

  const [form, setForm] = useState({
    staffId: currentUser.staffId,
    startsAt: getDefaultStartsAt(initialStartsAt),
    fullName: '',
    phone: '',
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState(() => {
    const activeServiceIds = new Set(activeServices.map(s => s.id));
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem(serviceStorageKey) || 'null');
        if (Array.isArray(stored)) {
          const filtered = stored.filter(id => activeServiceIds.has(id));
          if (filtered.length > 0) return filtered;
        }
      } catch {
        // ignore invalid localStorage payload
      }
    }

    const defaultService = activeServices.find(s => s.name?.trim() === 'Saç Kesimi');
    if (defaultService) return [defaultService.id];
    return activeServices[0] ? [activeServices[0].id] : [];
  });
  const [submitting, setSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(false);

  const currentStaffName = currentUser.fullName
    || activeStaff.find(b => b.id === currentUser.staffId)?.full_name
    || 'Personel';

  const roundedNow = roundToNextStepMinute(new Date());
  const todayDateValue = toDateInputValue(roundedNow);
  const minTimeForToday = toTimeInputValue(roundedNow);
  const startsAtParts = useMemo(() => {
    const parts = splitDateTimeLocalValue(form.startsAt);
    return {
      date: parts.date || todayDateValue,
      time: parts.time || minTimeForToday,
    };
  }, [form.startsAt, todayDateValue, minTimeForToday]);
  const timeOptions = useMemo(() => {
    const list = [];
    for (let minute = 0; minute < 24 * 60; minute += WALK_IN_STEP_MINUTES) {
      const hours = String(Math.floor(minute / 60)).padStart(2, '0');
      const mins = String(minute % 60).padStart(2, '0');
      list.push(`${hours}:${mins}`);
    }
    return list;
  }, []);
  const visibleTimeOptions = useMemo(() => {
    if (startsAtParts.date !== todayDateValue) return timeOptions;
    return timeOptions.filter(time => time >= minTimeForToday);
  }, [startsAtParts.date, todayDateValue, timeOptions, minTimeForToday]);

  useEffect(() => {
    if (initialStartsAt) {
      setForm(prev => ({ ...prev, startsAt: initialStartsAt }));
    }
  }, [initialStartsAt]);

  // Saat veya personel değişirse çakışma uyarısını sıfırla
  useEffect(() => { setConflictWarning(false); }, [form.startsAt, form.staffId]);

  useEffect(() => {
    if (selectedServiceIds.length === 0 || typeof window === 'undefined') return;
    try {
      localStorage.setItem(serviceStorageKey, JSON.stringify(selectedServiceIds));
    } catch {
      // ignore localStorage failures
    }
  }, [selectedServiceIds, serviceStorageKey]);

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

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const setStartsAtFromDate = (date) => {
    const rounded = roundToNextStepMinute(date);
    setForm(prev => ({ ...prev, startsAt: toDateTimeLocalValue(rounded) }));
  };

  const setStartsAtFromParts = (date, time) => {
    const combined = buildDateTimeLocalFromParts(date, time);
    if (!combined) return;
    setForm(prev => ({ ...prev, startsAt: combined }));
  };

  const handleDatePartChange = (date) => {
    let nextTime = startsAtParts.time;
    if (date === todayDateValue && nextTime < minTimeForToday) {
      nextTime = minTimeForToday;
    }
    setStartsAtFromParts(date, nextTime);
  };

  const handleTimePartChange = (time) => {
    const date = startsAtParts.date || todayDateValue;
    const nextTime = date === todayDateValue && time < minTimeForToday
      ? minTimeForToday
      : time;
    setStartsAtFromParts(date, nextTime);
  };

  const applyQuickPreset = (minutes) => {
    const base = form.startsAt ? new Date(form.startsAt) : roundToNextStepMinute(new Date());
    base.setMinutes(base.getMinutes() + minutes);
    setStartsAtFromDate(base);
  };

  const handleSubmit = async (event, force = false) => {
    event?.preventDefault();
    if (submitting) return;

    const fullName = form.fullName.trim();
    const phone = form.phone.trim();

    if (selectedServiceIds.length === 0 || !form.startsAt || !fullName) {
      toast('Hizmet, saat ve ad zorunludur.');
      return;
    }

    const startsAtDate = new Date(form.startsAt);
    if (Number.isNaN(startsAtDate.getTime())) {
      toast('Baslangic saati gecersiz.');
      return;
    }

    const endsAt = computeEndsAt(form.startsAt);
    if (!endsAt) return;

    const targetStaffId = form.staffId || currentUser.staffId;

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setSubmitting(true);
    try {
      const response = await api.post('/appointments/walk-in', {
        staffId: targetStaffId || undefined,
        serviceIds: selectedServiceIds,
        startsAt: startsAtDate.toISOString(),
        endsAt,
        fullName,
        phone: phone || undefined,
        ...(force && { force: true }),
      });

      const selectedStaff = activeStaff.find(b => b.id === targetStaffId)
        || activeStaff.find(b => b.id === currentUser.staffId)
        || null;

      const optimisticAppointment = {
        id: response?.data?.appointmentId || `walk-in-${Date.now()}`,
        starts_at: startsAtDate.toISOString(),
        ends_at: endsAt,
        status: 'confirmed',
        source: 'walk_in',
        phone_customers: {
          full_name: fullName,
          phone: phone || null,
        },
        staff: selectedStaff ? {
          id: selectedStaff.id,
          full_name: selectedStaff.full_name,
          color_hex: selectedStaff.color_hex,
        } : null,
        appointment_services: selectedServicesData.map(s => ({
          duration_min: s.duration_min,
          buffer_min: s.buffer_min || 0,
          services: { name: s.name },
        })),
        services: selectedServicesData[0] ? {
          name: selectedServicesData[0].name,
          duration_min: selectedServicesData[0].duration_min,
        } : null,
      };

      onSuccess?.(optimisticAppointment);
      onClose();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.error === 'slot_conflict') {
        setConflictWarning(true);
      } else {
        toast(err.response?.data?.error || 'Randevusuz kayit eklenemedi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const endsAtPreview = computeEndsAt(form.startsAt);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 z-0 bg-black/40 dark:bg-black/60" />
      <div className="relative z-10 h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain bg-white dark:bg-zinc-900 p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl animate-fadeIn text-zinc-900 dark:text-zinc-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Randevusuz Ekle</h2>
          <button disabled={submitting} onClick={handleClose} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 font-black text-xl leading-none disabled:opacity-50">✕</button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <fieldset disabled={submitting} className="space-y-4">
                        {/* Ad Soyad */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1">Ad Soyad</label>
              <input
                type="text"
                placeholder="Ahmet Yılmaz"
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    phoneInputRef.current?.focus();
                  }
                }}
                className="w-full p-4 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none text-sm font-bold"
              />
            </div>

            {/* Telefon (opsiyonel) */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1">
                Telefon <span className="normal-case font-normal text-zinc-300 dark:text-zinc-400">(opsiyonel)</span>
              </label>
              <input
                ref={phoneInputRef}
                type="tel"
                placeholder="05XXXXXXXXX"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                inputMode="numeric"
                autoComplete="tel-national"
                enterKeyHint="done"
                maxLength={11}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                className="w-full p-4 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none text-sm font-bold"
              />
            </div>
            
            {/* Personel seçimi (sadece sahip için) */}
            {currentUser.isOwner && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1">Personel</label>
                <select
                  value={form.staffId}
                  onChange={e => setForm({ ...form, staffId: e.target.value })}
                  className="w-full p-4 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none text-sm font-bold"
                >
                  <option value={currentUser.staffId}>{currentStaffName}</option>
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
                      className={`w-full min-h-[52px] flex justify-between items-center p-3.5 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500'}`}
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
              {selectedServiceIds.length > 0 && (
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-2 ml-1">
                  Toplam: {totalDuration} dk
                </p>
              )}
            </div>

            {/* Başlangıç tarihi/saati */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1">Başlangıç</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startsAtParts.date}
                  min={todayDateValue}
                  onChange={e => handleDatePartChange(e.target.value)}
                  className="w-full min-w-0 p-4 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none text-sm font-bold"
                />
                <select
                  value={startsAtParts.time}
                  onChange={e => handleTimePartChange(e.target.value)}
                  className="w-full min-w-0 p-4 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none text-sm font-bold"
                >
                  {visibleTimeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {QUICK_TIME_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyQuickPreset(preset.minutes)}
                    className="h-10 rounded-xl border-2 border-zinc-100 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {selectedServiceIds.length > 0 && form.startsAt && endsAtPreview && (
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-2 ml-1">
                  Bitiş: {new Date(endsAtPreview).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>


          </fieldset>

          <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] bg-gradient-to-t from-white via-white dark:from-zinc-900 dark:via-zinc-900 to-transparent">
            <Button type="submit" loading={submitting}>
              Ekle
            </Button>
          </div>
        </form>
      </div>

      {conflictWarning && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={() => setConflictWarning(false)} />
          <div className="relative w-full max-w-xs bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">⚠️</span>
              <div className="space-y-1">
                <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">Çakışan Randevu</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Bu saatte başka bir randevu var. Yine de eklemek istiyor musun?</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSubmit(null, true)}
                disabled={submitting}
                className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                Yine de Ekle
              </button>
              <button
                type="button"
                onClick={() => setConflictWarning(false)}
                disabled={submitting}
                className="flex-1 h-10 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-[11px] font-black uppercase tracking-widest hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkInModal;
