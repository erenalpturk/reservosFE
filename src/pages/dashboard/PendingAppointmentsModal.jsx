import { fmtTime } from './utils';

const PendingAppointmentsModal = ({ appointments, user, onClose, onSelect, onShowInCalendar }) => {
  const sortedAppointments = [...appointments].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div className="relative w-full max-w-md max-h-[82dvh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-fadeIn">
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-900">Bekleyen Randevular</h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
              {sortedAppointments.length} adet onay bekliyor
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-300 hover:text-zinc-700 font-black text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-2">
          {sortedAppointments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Bekleyen randevu yok</p>
            </div>
          ) : (
            sortedAppointments.map((appt) => (
              <div
                key={appt.id}
                className="w-full text-left rounded-2xl border border-zinc-100 bg-zinc-50/70 px-3 py-3 hover:border-orange-300 hover:bg-orange-50 transition-all"
              >
                <button type="button" className="w-full text-left" onClick={() => onSelect(appt)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-zinc-800 truncate">
                        {appt.phone_customers?.full_name || 'Walk-In'}
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
                      {new Date(appt.starts_at).toLocaleDateString('tr-TR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                    <div className="text-right">{fmtTime(appt.starts_at)} - {fmtTime(appt.ends_at)}</div>
                    <div className="truncate">{appt.services?.name || 'Hizmet yok'}</div>
                    <div className="text-right text-zinc-500">
                      {user?.isOwner ? (appt.staff?.full_name || 'Personel yok') : 'Detayı aç'}
                    </div>
                  </div>

                  {appt.notes && (
                    <div className="mt-2 text-[11px] font-medium text-zinc-500 line-clamp-2">
                      Not: {appt.notes}
                    </div>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingAppointmentsModal;
