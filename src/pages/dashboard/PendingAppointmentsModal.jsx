import { useState } from 'react';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { fmtTime } from './utils';

const PendingAppointmentsModal = ({
  appointments,
  poolAppointments,
  user,
  onClose,
  onSelect,
  onShowInCalendar,
  onClaimed,
}) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [claimingId, setClaimingId] = useState(null);
  const toast = useToast();

  const sortedPending = [...appointments].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const sortedPool = [...(poolAppointments || [])].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  const handleClaim = async (apptId) => {
    setClaimingId(apptId);
    try {
      await api.patch(`/appointments/${apptId}/claim-pool`);
      toast('Randevu başarıyla üstlenildi.', 'success');
      onClaimed?.();
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'already_claimed') {
        toast('Bu randevu zaten üstlenildi.', 'info');
      } else if (code === 'slot_conflict') {
        toast('Takviminizde bu saate çakışan randevu var.', 'info');
      } else {
        toast('Üstlenemedi. Tekrar deneyin.', 'info');
      }
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div className="relative w-full max-w-md max-h-[82dvh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-fadeIn">
        {/* Başlık */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900">Randevular</h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
              {activeTab === 'pending'
                ? `${sortedPending.length} adet onay bekliyor`
                : `${sortedPool.length} adet havuzda`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-300 hover:text-zinc-700 font-black text-xl leading-none">✕</button>
        </div>

        {/* Tab seçici */}
        <div className="flex gap-1.5 px-4 pt-3 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'pending'
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            Bekleyen {sortedPending.length > 0 && `(${sortedPending.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pool')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'pool'
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            Havuz {sortedPool.length > 0 && `(${sortedPool.length})`}
          </button>
        </div>

        {/* İçerik */}
        <div className="overflow-y-auto px-4 py-3 space-y-2">
          {activeTab === 'pending' && (
            sortedPending.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Bekleyen randevu yok</p>
              </div>
            ) : (
              sortedPending.map((appt) => (
                <div
                  key={appt.id}
                  className="w-full text-left rounded-2xl border border-zinc-100 bg-zinc-50/70 px-3 py-3 hover:border-orange-300 hover:bg-orange-50 transition-all"
                >
                  <button type="button" className="w-full text-left" onClick={() => onSelect(appt)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-zinc-800 truncate">
                            {appt.phone_customers?.full_name || appt.customer_name || 'Randevusuz'}
                          </span>
                          {appt.redirect_type === 'direct' && (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-green-100 text-green-700 flex-shrink-0">
                              Yönlendirildi
                            </span>
                          )}
                        </div>
                        {appt.phone_customers?.phone && (
                          <div className="text-[11px] font-bold text-zinc-400 mt-0.5">{appt.phone_customers.phone}</div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 flex-shrink-0">
                        Bekliyor
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-bold text-zinc-600">
                      <div>
                        {new Date(appt.starts_at).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-right">{fmtTime(appt.starts_at)} - {fmtTime(appt.ends_at)}</div>
                      <div className="truncate">{appt.services?.name || 'Hizmet yok'}</div>
                      <div className="text-right text-zinc-500">
                        {user?.isOwner ? (appt.staff?.full_name || 'Personel yok') : 'Detayı aç'}
                      </div>
                    </div>

                    {appt.notes && (
                      <div className="mt-2 text-[11px] font-medium text-zinc-500 line-clamp-2">Not: {appt.notes}</div>
                    )}
                  </button>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onShowInCalendar(appt, 'day')}
                      className="py-1.5 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                    >
                      Takvimde Gör / Gün
                    </button>
                    <button
                      type="button"
                      onClick={() => onShowInCalendar(appt, 'week')}
                      className="py-1.5 rounded-xl border border-zinc-300 text-zinc-700 text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-all"
                    >
                      Takvimde Gör / Hafta
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'pool' && (
            sortedPool.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Havuzda randevu yok</p>
              </div>
            ) : (
              sortedPool.map((appt) => (
                <div
                  key={appt.id}
                  className="w-full text-left rounded-2xl border border-orange-200 bg-orange-50/60 px-3 py-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-zinc-800 truncate">
                        {appt.phone_customers?.full_name || appt.customer_name || 'Randevusuz'}
                      </div>
                      {appt.phone_customers?.phone && (
                        <div className="text-[11px] font-bold text-zinc-400 mt-0.5">{appt.phone_customers.phone}</div>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-200 text-orange-700 flex-shrink-0">
                      Havuzda
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-bold text-zinc-600">
                    <div>
                      {new Date(appt.starts_at).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="text-right">{fmtTime(appt.starts_at)} - {fmtTime(appt.ends_at)}</div>
                    <div className="truncate col-span-2">
                      {(appt.appointment_services || []).map(as => as.services?.name).filter(Boolean).join(', ') || 'Hizmet yok'}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={claimingId === appt.id}
                    onClick={() => handleClaim(appt.id)}
                    className="mt-3 w-full py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-60"
                  >
                    {claimingId === appt.id ? 'Üstleniliyor...' : 'Sahiplen'}
                  </button>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingAppointmentsModal;
