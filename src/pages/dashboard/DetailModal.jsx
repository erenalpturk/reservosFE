import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button';
import RedirectModal from './RedirectModal';
import { STATUS_LABELS, STATUS_COLORS, fmtTime } from './utils';
import { useToast } from '../../components/Toast';

function getServiceLabel(appt) {
  const names = (appt.appointment_services || [])
    .map(item => item.services?.name)
    .filter(Boolean);

  if (names.length > 0) return names.join(', ');
  return appt.services?.name || '';
}

function getDurationLabel(appt) {
  const fromTimes = Math.round((new Date(appt.ends_at) - new Date(appt.starts_at)) / 60000);
  if (Number.isFinite(fromTimes) && fromTimes > 0) return `${fromTimes} dk`;

  const fromMultiServices = (appt.appointment_services || []).reduce(
    (sum, item) => sum + (item.duration_min || item.services?.duration_min || 0),
    0
  );
  if (fromMultiServices > 0) return `${fromMultiServices} dk`;

  const singleServiceDuration = appt.services?.duration_min;
  if (singleServiceDuration) return `${singleServiceDuration} dk`;

  return '';
}

function toDateTimeParts(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { datePart: '', timePart: '' };

  const pad = (n) => String(n).padStart(2, '0');
  return {
    datePart: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    timePart: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

const DetailModal = ({ appt, user, businessStaff, onClose, onAction, onCancel, onRedirected, onReschedule }) => {
  const [loading, setLoading] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const toast = useToast();
  const isPast = new Date(appt.starts_at) < new Date();
  const serviceLabel = getServiceLabel(appt);
  const durationLabel = getDurationLabel(appt);
  const canReschedule = ['pending', 'confirmed', 'in_pool'].includes(appt.status) && !isPast;
  const durationMinutes = useMemo(() => {
    const fromRange = Math.round((new Date(appt.ends_at) - new Date(appt.starts_at)) / 60000);
    if (Number.isFinite(fromRange) && fromRange > 0) return fromRange;

    const fromServices = (appt.appointment_services || []).reduce(
      (sum, item) => sum + (item.duration_min || item.services?.duration_min || 0),
      0
    );
    if (fromServices > 0) return fromServices;

    return appt.services?.duration_min || 0;
  }, [appt]);

  useEffect(() => {
    const { datePart, timePart } = toDateTimeParts(appt.starts_at);
    setRescheduleDate(datePart);
    setRescheduleTime(timePart);
    setShowReschedule(false);
  }, [appt.starts_at]);

  const doAction = async (action, reason) => {
    setLoading(action);
    try { await onAction(appt.id, action, reason); onClose(); }
    catch { toast('İşlem başarısız.'); setLoading(null); }
  };

  const doCancel = async () => {
    setLoading('cancel');
    setShowCancelConfirm(false);
    try { await onCancel(appt.id, cancelReason); onClose(); }
    catch { toast('İptal başarısız.'); setLoading(null); }
  };

  const doReject = async () => {
    setLoading('reject');
    setShowRejectConfirm(false);
    try { await onAction(appt.id, 'reject', rejectReason); onClose(); }
    catch { toast('İşlem başarısız.'); setLoading(null); }
  };

  const handleRedirected = () => {
    setShowRedirectModal(false);
    onRedirected?.();
    onClose();
  };

  const renderRescheduleToggle = () => (
    <button
      type="button"
      onClick={() => setShowReschedule(v => !v)}
      disabled={loading === 'reschedule'}
      className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-sm font-black uppercase tracking-widest text-amber-700 transition-all hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {showReschedule ? 'Düzenlemeyi Kapat' : 'Düzenle / Ertele'}
    </button>
  );

  const applyOffsetMinutes = (minutes) => {
    const selected = rescheduleDate && rescheduleTime
      ? new Date(`${rescheduleDate}T${rescheduleTime}`)
      : null;
    const base = selected && !Number.isNaN(selected.getTime())
      ? selected
      : new Date(appt.starts_at);
    base.setMinutes(base.getMinutes() + minutes);
    const { datePart, timePart } = toDateTimeParts(base.toISOString());
    setRescheduleDate(datePart);
    setRescheduleTime(timePart);
  };

  const doReschedule = async () => {
    if (!onReschedule) return;
    if (!rescheduleDate || !rescheduleTime) {
      toast('Tarih ve saat seçmelisiniz.');
      return;
    }
    if (!durationMinutes || durationMinutes < 1) {
      toast('Randevu süresi hesaplanamadı.');
      return;
    }

    const startsAt = new Date(`${rescheduleDate}T${rescheduleTime}`);
    if (Number.isNaN(startsAt.getTime())) {
      toast('Tarih veya saat geçersiz.');
      return;
    }

    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
    setLoading('reschedule');
    try {
      await onReschedule(appt.id, startsAt.toISOString(), endsAt.toISOString());
      onClose();
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'slot_conflict') toast('Seçilen saatte çakışan bir randevu var.');
      else toast('Randevu düzenlenemedi.');
      setLoading(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 shadow-2xl animate-fadeIn text-zinc-900 dark:text-zinc-900">

          {/* Başlık satırı */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="font-black text-xl uppercase tracking-tight leading-tight">
                {appt.phone_customers?.full_name || appt.customer_name || 'Randevusuz'}
              </div>
              {appt.phone_customers?.phone && (
                <div className="text-xs font-bold text-zinc-400 mt-0.5">{appt.phone_customers.phone}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[appt.status] || 'bg-zinc-100 text-zinc-400'}`}>
                {STATUS_LABELS[appt.status]}
              </span>
              <button onClick={onClose} className="text-zinc-300 hover:text-zinc-700 font-black text-xl leading-none">✕</button>
            </div>
          </div>

          {/* Detaylar */}
          <div className="bg-zinc-50 rounded-2xl px-4 py-3 space-y-2 mb-4 text-sm">
            <div className="flex items-center gap-2.5">
              <span className="opacity-40">📅</span>
              <span className="font-bold text-zinc-700">
                {new Date(appt.starts_at).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="opacity-40">⏱</span>
              <span className="font-bold text-zinc-700">{fmtTime(appt.starts_at)} — {fmtTime(appt.ends_at)}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="opacity-40">✂️</span>
              <span className="font-bold text-zinc-700">{serviceLabel || 'Hizmet yok'}</span>
              {durationLabel ? <span className="text-xs text-zinc-400">({durationLabel})</span> : null}
            </div>
            {user?.isOwner && appt.staff && (
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: appt.staff.color_hex }} />
                <span className="font-bold text-zinc-700">{appt.staff.full_name}</span>
              </div>
            )}
            {/* Yönlendirme bilgisi */}
            {appt.redirect_type === 'direct' && (
              <div className="flex items-center gap-2.5">
                <span className="opacity-40">↪️</span>
                <span className="text-[11px] font-bold text-green-600 uppercase tracking-widest">Doğrudan Yönlendirildi</span>
              </div>
            )}
            {appt.redirect_type === 'pool' && (
              <div className="flex items-center gap-2.5">
                <span className="opacity-40">📢</span>
                <span className="text-[11px] font-bold text-orange-600 uppercase tracking-widest">Havuzdan Üstlenildi</span>
              </div>
            )}
          </div>

          {/* Aksiyonlar */}
          {appt.status === 'pending' && (
            <div className="space-y-2">
              {showRejectConfirm ? (
                <div className="space-y-2">
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 uppercase tracking-widest">
                    Randevuyu reddetmek istediğinize emin misiniz?
                  </div>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Red sebebi (opsiyonel)"
                    rows={2}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 placeholder-zinc-400 resize-none focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" disabled={loading === 'reject'} onClick={() => { setShowRejectConfirm(false); setRejectReason(''); }}>
                      Vazgeç
                    </Button>
                    <Button variant="danger" loading={loading === 'reject'} onClick={doReject}>
                      Evet, Reddet
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Button variant="primary" loading={loading === 'confirm'} onClick={() => doAction('confirm')}>Onayla</Button>
                    <Button variant="secondary" loading={loading === 'reject'} onClick={() => setShowRejectConfirm(true)}>Reddet</Button>
                  </div>
                  {canReschedule && (
                    renderRescheduleToggle()
                  )}
                </>
              )}
              {!showRejectConfirm && (
                <button
                  type="button"
                  onClick={() => setShowRedirectModal(true)}
                  className="w-full py-2.5 rounded-2xl border-2 border-zinc-200 text-zinc-600 text-[11px] font-black uppercase tracking-widest hover:border-zinc-400 hover:text-zinc-900 transition-all"
                >
                  ↪ Yönlendir
                </button>
              )}
            </div>
          )}
          {appt.status === 'confirmed' && !isPast && (
            showCancelConfirm ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 uppercase tracking-widest">
                  Randevuyu iptal etmek istediğinize emin misiniz?
                </div>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="İptal sebebi (opsiyonel)"
                  rows={2}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 placeholder-zinc-400 resize-none focus:outline-none focus:border-zinc-400 transition-colors"
                />
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={loading === 'cancel'} onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }}>
                    Vazgeç
                  </Button>
                  <Button variant="danger" loading={loading === 'cancel'} onClick={doCancel}>
                    Evet, İptal Et
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button variant="danger" loading={loading === 'cancel'} onClick={() => setShowCancelConfirm(true)}>
                  İptal Et
                </Button>
                {canReschedule && (
                  renderRescheduleToggle()
                )}
              </div>
            )
          )}
          {canReschedule && showReschedule && !showRejectConfirm && !showCancelConfirm && (
            <div className="mt-3 space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                Randevu Düzenle
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 focus:outline-none focus:border-zinc-400 transition-colors"
                />
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  step={300}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 focus:outline-none focus:border-zinc-400 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyOffsetMinutes(15)}
                  className="flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:border-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  +15 dk
                </button>
                <button
                  type="button"
                  onClick={() => applyOffsetMinutes(30)}
                  className="flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:border-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  +30 dk
                </button>
                <button
                  type="button"
                  onClick={() => applyOffsetMinutes(60)}
                  className="flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:border-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  +60 dk
                </button>
              </div>
              <Button variant="primary" loading={loading === 'reschedule'} onClick={doReschedule}>
                Değişiklikleri Kaydet
              </Button>
            </div>
          )}
          {appt.status === 'confirmed' && isPast && (
            <div className="flex gap-2">
              <Button variant="primary" loading={loading === 'complete'} onClick={() => doAction('complete')}>Tamamlandı</Button>
              <Button variant="secondary" loading={loading === 'no-show'} onClick={() => doAction('no-show')}>Gelmedi</Button>
            </div>
          )}
        </div>
      </div>

      {showRedirectModal && (
        <RedirectModal
          appt={appt}
          businessStaff={businessStaff}
          user={user}
          onClose={() => setShowRedirectModal(false)}
          onRedirected={handleRedirected}
        />
      )}
    </>
  );
};

export default DetailModal;
