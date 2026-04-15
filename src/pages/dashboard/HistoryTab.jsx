import { STATUS_LABELS, STATUS_COLORS, fmtTime } from './utils';

function getServiceLabel(appt) {
  const names = (appt.appointment_services || [])
    .map(item => item.services?.name)
    .filter(Boolean);
  if (names.length > 0) return names.join(', ');
  return appt.services?.name || '';
}

const HistoryTab = ({ appointments, loading, onSelect }) => {
  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-6 w-6 border-4 border-zinc-900 dark:border-zinc-300 border-t-transparent rounded-full" />
    </div>
  );

  if (!appointments || appointments.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <div className="text-3xl">🗂️</div>
      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">
        Geçmişte iptal veya reddedilen randevu yok
      </p>
    </div>
  );

  const sorted = [...appointments].sort(
    (a, b) => new Date(b.starts_at) - new Date(a.starts_at)
  );

  return (
    <div className="flex flex-col gap-1">
      {sorted.map(appt => {
        const serviceLabel = getServiceLabel(appt);
        const date = new Date(appt.starts_at).toLocaleDateString('tr-TR', {
          day: 'numeric', month: 'short', year: 'numeric',
        });

        return (
          <button
            key={appt.id}
            onClick={() => onSelect(appt)}
            className="w-full flex items-stretch gap-0 rounded-lg overflow-hidden text-left transition-all hover:opacity-80 active:scale-[0.99] bg-white dark:bg-zinc-800/60"
            style={{ borderLeft: '3px solid #d4d4d8' }}
          >
            {/* Sol: tarih + saat */}
            <div className="flex flex-col items-end justify-center px-3 py-3 gap-0.5 flex-shrink-0 w-14">
              <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400 leading-none">
                {fmtTime(appt.starts_at)}
              </span>
              <span className="text-[10px] font-semibold text-zinc-300 dark:text-zinc-600 leading-none">
                {date}
              </span>
            </div>

            {/* Dikey ayraç */}
            <div className="w-px bg-zinc-100 dark:bg-zinc-700 my-2 flex-shrink-0" />

            {/* Orta: isim + hizmet */}
            <div className="flex-1 min-w-0 px-3 py-3 flex flex-col justify-center gap-0.5">
              <span className="text-[14px] text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                {appt.phone_customers?.full_name || appt.customer_name || 'Randevusuz'}
              </span>
              {serviceLabel ? (
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 truncate">
                  {serviceLabel}
                </span>
              ) : null}
            </div>

            {/* Statü badge */}
            <div className="flex items-center px-3 flex-shrink-0">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[appt.status] || 'bg-zinc-100 text-zinc-400'}`}>
                {STATUS_LABELS[appt.status] || appt.status}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default HistoryTab;
