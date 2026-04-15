import { useState } from 'react';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { fmtTime } from './utils';

/**
 * RedirectModal — Randevu yönlendirme akışı
 *
 * Görünümler:
 *  - choose       : Havuza mı, doğrudan mı?
 *  - pool-confirm : Havuza gönderme onayı
 *  - direct-pick  : Hangi çalışana? (takvim önizleme butonu ile)
 *  - direct-preview: Seçilen çalışanın günlük takvimi + çakışma durumu
 */
const RedirectModal = ({ appt, businessStaff, user, onClose, onRedirected }) => {
  const [view, setView] = useState('choose');
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [scheduleData, setScheduleData] = useState(null); // { staff, appointments, hasConflict }
  const toast = useToast();

  const colleagues = (businessStaff || []).filter(s => s.id !== user?.staffId && s.is_active !== false);
  const apptDate = appt.starts_at?.split('T')[0];

  const handleSendToPool = async () => {
    setLoading(true);
    try {
      await api.patch(`/appointments/${appt.id}/redirect-pool`);
      toast('Randevu havuza gönderildi.', 'success');
      onRedirected?.();
      onClose();
    } catch {
      toast('Havuza gönderilemedi.', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewSchedule = async (staff) => {
    setSelectedStaff(staff);
    setLoading(true);
    try {
      const r = await api.get(`/appointments/${appt.id}/staff-schedule`, {
        params: { staffId: staff.id, date: apptDate },
      });
      setScheduleData(r.data);
      setView('direct-preview');
    } catch {
      toast('Takvim yüklenemedi.', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleSendDirect = async () => {
    if (!selectedStaff) return;
    setLoading(true);
    try {
      await api.patch(`/appointments/${appt.id}/redirect-direct`, { toStaffId: selectedStaff.id });
      toast(`Randevu ${selectedStaff.full_name} adlı personele yönlendirildi.`, 'success');
      onRedirected?.();
      onClose();
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'slot_conflict') {
        toast('Bu personelin takvimine çakışan randevu var.', 'info');
      } else {
        toast('Yönlendirilemedi.', 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-fadeIn text-zinc-900">

        {/* ── choose view ── */}
        {view === 'choose' && (
          <div className="p-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black uppercase tracking-tight">Yönlendirme Seçeneği</h2>
              <button type="button" onClick={onClose} className="text-zinc-300 hover:text-zinc-700 font-black text-xl leading-none">✕</button>
            </div>

            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
              {appt.phone_customers?.full_name || appt.customer_name || 'Randevusuz'} ·{' '}
              {fmtTime(appt.starts_at)} — {fmtTime(appt.ends_at)}
            </div>

            <div className="space-y-3">
              {/* Havuz seçeneği */}
              <button
                type="button"
                onClick={() => setView('pool-confirm')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100 transition-all text-left"
              >
                <span className="text-2xl">📢</span>
                <div>
                  <div className="font-black text-orange-700 text-sm uppercase tracking-wide">Havuza Gönder</div>
                  <div className="text-[11px] font-medium text-orange-500 mt-0.5">
                    Tüm çalışanlara bildirim gönderilir. İlk kabul eden üstlenir.
                  </div>
                </div>
              </button>

              {/* Doğrudan seçeneği */}
              <button
                type="button"
                onClick={() => setView('direct-pick')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-green-200 bg-green-50 hover:border-green-400 hover:bg-green-100 transition-all text-left"
              >
                <span className="text-2xl">👤</span>
                <div>
                  <div className="font-black text-green-700 text-sm uppercase tracking-wide">Doğrudan Gönder</div>
                  <div className="text-[11px] font-medium text-green-600 mt-0.5">
                    Belirli bir çalışana yönlendir. Takvimini görebilirsiniz.
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── pool-confirm view ── */}
        {view === 'pool-confirm' && (
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-5">
              <button type="button" onClick={() => setView('choose')} className="text-zinc-400 hover:text-zinc-700 font-black text-xl leading-none">‹</button>
              <h2 className="text-lg font-black uppercase tracking-tight text-orange-600">Havuza Gönder</h2>
              <button type="button" onClick={onClose} className="ml-auto text-zinc-300 hover:text-zinc-700 font-black text-xl leading-none">✕</button>
            </div>

            <div className="rounded-2xl bg-orange-50 border border-orange-200 px-4 py-4 mb-5">
              <p className="text-sm font-bold text-orange-700 leading-relaxed">
                Bu randevu, işletmedeki tüm çalışanlara bildirim olarak gönderilecek.
                İlk kabul eden kişi randevuyu üstlenir.
              </p>
              <div className="mt-3 text-[11px] font-black text-orange-500 uppercase tracking-widest">
                {appt.phone_customers?.full_name || appt.customer_name || 'Randevusuz'} · {fmtTime(appt.starts_at)} — {fmtTime(appt.ends_at)}
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleSendToPool}
              className="w-full py-3.5 rounded-2xl bg-orange-500 text-white font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-60"
            >
              {loading ? 'Gönderiliyor...' : 'Havuza Gönder'}
            </button>
          </div>
        )}

        {/* ── direct-pick view ── */}
        {view === 'direct-pick' && (
          <div className="p-5 pb-8 max-h-[80dvh] flex flex-col">
            <div className="flex items-center gap-3 mb-5 flex-shrink-0">
              <button type="button" onClick={() => setView('choose')} className="text-zinc-400 hover:text-zinc-700 font-black text-xl leading-none">‹</button>
              <h2 className="text-lg font-black uppercase tracking-tight text-green-700">Personel Seç</h2>
              <button type="button" onClick={onClose} className="ml-auto text-zinc-300 hover:text-zinc-700 font-black text-xl leading-none">✕</button>
            </div>

            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex-shrink-0">
              {appt.phone_customers?.full_name || appt.customer_name || 'Randevusuz'} · {fmtTime(appt.starts_at)} — {fmtTime(appt.ends_at)}
            </div>

            <div className="overflow-y-auto space-y-2">
              {colleagues.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Başka aktif personel yok
                </div>
              ) : (
                colleagues.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-100 bg-zinc-50 hover:border-green-200 hover:bg-green-50 transition-all"
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: staff.color_hex || '#888' }}
                    />
                    <span className="flex-1 font-bold text-sm text-zinc-800">{staff.full_name}</span>
                    <button
                      type="button"
                      disabled={loading && selectedStaff?.id === staff.id}
                      onClick={() => handlePreviewSchedule(staff)}
                      className="px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest hover:bg-green-200 transition-all disabled:opacity-60"
                    >
                      {loading && selectedStaff?.id === staff.id ? '...' : 'Takvimi Gör'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── direct-preview view ── */}
        {view === 'direct-preview' && scheduleData && (
          <div className="p-5 pb-8 max-h-[80dvh] flex flex-col">
            <div className="flex items-center gap-3 mb-4 flex-shrink-0">
              <button type="button" onClick={() => setView('direct-pick')} className="text-zinc-400 hover:text-zinc-700 font-black text-xl leading-none">‹</button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: scheduleData.staff?.color_hex || '#888' }}
                />
                <span className="font-black text-sm uppercase tracking-tight truncate">{scheduleData.staff?.full_name}</span>
              </div>
              <button type="button" onClick={onClose} className="ml-auto text-zinc-300 hover:text-zinc-700 font-black text-xl leading-none">✕</button>
            </div>

            {/* Çakışma uyarısı */}
            {scheduleData.hasConflict ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 uppercase tracking-widest flex-shrink-0">
                ⚠️ Bu saatte çakışan randevu var
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[11px] font-bold text-green-700 uppercase tracking-widest flex-shrink-0">
                ✓ Bu saat müsait
              </div>
            )}

            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex-shrink-0">
              {new Date(apptDate).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} günkü program
            </div>

            <div className="overflow-y-auto space-y-2 mb-4">
              {scheduleData.appointments.length === 0 ? (
                <div className="py-6 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  Bu gün randevu yok
                </div>
              ) : (
                scheduleData.appointments.map((a) => {
                  const isRequested =
                    new Date(a.starts_at) < new Date(appt.ends_at) &&
                    new Date(a.ends_at) > new Date(appt.starts_at);
                  return (
                    <div
                      key={a.id}
                      className={`px-3 py-2 rounded-xl text-[11px] font-bold border ${
                        isRequested
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-zinc-100 bg-zinc-50 text-zinc-600'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>{fmtTime(a.starts_at)} — {fmtTime(a.ends_at)}</span>
                        {isRequested && <span className="text-red-500">Çakışıyor</span>}
                      </div>
                      <div className="text-zinc-500 mt-0.5">
                        {a.phone_customers?.full_name || 'Randevusuz'}
                        {' · '}
                        {(a.appointment_services || []).map(as => as.services?.name).filter(Boolean).join(', ') || '—'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* İstenen slot vurgusu */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-bold text-zinc-500 mb-4 flex-shrink-0">
              Yönlendirilecek: {fmtTime(appt.starts_at)} — {fmtTime(appt.ends_at)} ·{' '}
              {appt.phone_customers?.full_name || appt.customer_name || 'Randevusuz'}
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleSendDirect}
              className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-60 ${
                scheduleData.hasConflict
                  ? 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {loading
                ? 'Yönlendiriliyor...'
                : `${scheduleData.staff?.full_name?.split(' ')[0]}'e Yönlendir`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedirectModal;
