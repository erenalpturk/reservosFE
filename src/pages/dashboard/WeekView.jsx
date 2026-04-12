import { useState } from 'react';
import { DAY_NAMES, todayStr, toLocalDate, fmtTime } from './utils';

const CANCELLED = new Set(['cancelled_by_customer', 'cancelled_by_shop', 'rejected', 'expired', 'no_show']);

const BAR_COLOR = {
  confirmed: '#22c55e',
  pending: '#fb923c',
  in_pool: '#fb923c',
  completed: '#60a5fa',
};

function barColor(status) {
  if (CANCELLED.has(status)) return '#f87171';
  return BAR_COLOR[status] || '#a1a1aa';
}

const CHIP_DOT = {
  confirmed: 'bg-green-500',
  pending: 'bg-orange-400',
  in_pool: 'bg-orange-400',
  completed: 'bg-blue-400',
};

function chipDot(status) {
  if (CANCELLED.has(status)) return 'bg-red-400';
  return CHIP_DOT[status] || 'bg-zinc-300';
}

const VISIBLE = 4;

const LEGEND = [
  { label: 'Onaylı',     cls: 'bg-green-500' },
  { label: 'Bekleyen',   cls: 'bg-orange-400' },
  { label: 'Tamamlandı', cls: 'bg-blue-400' },
  { label: 'İptal',      cls: 'bg-red-400' },
];

/* ─── Gün kartı ──────────────────────────────────── */
const DayCard = ({ day, appts, isToday, startHour, endHour, onDayClick, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const totalMin = (endHour - startHour) * 60 || 1;
  const sorted = [...appts].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const hidden = sorted.length - VISIBLE;
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE);

  /* Yoğunluk barı segmentleri */
  const segments = sorted.map(appt => {
    const s = new Date(appt.starts_at);
    const e = new Date(appt.ends_at);
    const startMin = s.getHours() * 60 + s.getMinutes() - startHour * 60;
    const durMin = (e - s) / 60000;
    return {
      left: Math.max(0, Math.min(100, startMin / totalMin * 100)),
      width: Math.max(1, Math.min(100 - Math.max(0, startMin / totalMin * 100), durMin / totalMin * 100)),
      color: barColor(appt.status),
    };
  });

  return (
    <div
      className={`rounded-xl bg-white dark:bg-zinc-800/60 overflow-hidden border transition-all ${
        isToday ? 'border-blue-400 dark:border-blue-500' : 'border-zinc-100 dark:border-zinc-800'
      }`}
      style={isToday ? { borderLeftWidth: '3px' } : {}}
    >
      {/* Header — tıklayınca gün görünümüne git */}
      <button
        onClick={() => onDayClick(day)}
        className="w-full flex items-center justify-between px-3 pt-3 pb-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {isToday && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
          <span className={`text-[13px] font-black ${isToday ? 'text-blue-500 dark:text-blue-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
            {toLocalDate(day).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        </div>
        {appts.length > 0 && (
          <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 flex-shrink-0">
            {appts.length} randevu
          </span>
        )}
      </button>

      {appts.length === 0 ? (
        <p className="px-3 pb-3 text-[11px] font-bold text-zinc-300 dark:text-zinc-600">Randevu yok</p>
      ) : (
        <>
          {/* Yoğunluk barı */}
          <div className="relative mx-3 mb-2 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
            {segments.map((seg, i) => (
              <div
                key={i}
                className="absolute top-0 h-full rounded-full"
                style={{ left: `${seg.left}%`, width: `${seg.width}%`, backgroundColor: seg.color }}
              />
            ))}
          </div>

          {/* Randevu chip'leri */}
          <div className="px-3 pb-1 flex flex-wrap gap-1">
            {visible.map(appt => (
              <button
                key={appt.id}
                onClick={(e) => { e.stopPropagation(); onSelect(appt); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${chipDot(appt.status)}`} />
                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                  {fmtTime(appt.starts_at)} {(appt.phone_customers?.full_name || 'Walk-In').split(' ')[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Genişlet / daralt */}
          {hidden > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full px-3 pb-3 text-left text-[11px] font-bold text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              {expanded ? '‹ Daha az göster' : `+ ${hidden} randevu daha`}
            </button>
          )}
          {!hidden && <div className="pb-2" />}
        </>
      )}
    </div>
  );
};

/* ─── Hafta görünümü ─────────────────────────────── */
const WeekView = ({ weekDays, appointments, loading, onSelect, onDayClick, startHour, endHour }) => {
  const today = todayStr();

  const byDay = {};
  weekDays.forEach(d => { byDay[d] = []; });
  appointments.forEach(appt => {
    const day = appt.starts_at?.split('T')[0];
    if (byDay[day]) byDay[day].push(appt);
  });

  /* Haftalık özet */
  const total     = appointments.length;
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const pending   = appointments.filter(a => a.status === 'pending' || a.status === 'in_pool').length;
  const completed = appointments.filter(a => a.status === 'completed').length;

  const stats = [
    { label: 'Toplam',    value: total,     cls: 'text-zinc-800 dark:text-zinc-100' },
    { label: 'Onaylı',    value: confirmed, cls: 'text-green-600 dark:text-green-400' },
    { label: 'Bekleyen',  value: pending,   cls: 'text-orange-500' },
    { label: 'Tamamlandı',value: completed, cls: 'text-blue-500' },
  ];

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-6 w-6 border-4 border-zinc-900 dark:border-zinc-300 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col gap-2 px-1 pb-2">

        {/* Haftalık özet kartları */}
        <div className="flex gap-2">
          {stats.map(({ label, value, cls }) => (
            <div key={label} className="flex-1 bg-white dark:bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-100 dark:border-zinc-800 text-center">
              <div className={`text-lg font-black leading-none ${cls}`}>{value}</div>
              <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Efsane */}
        <div className="flex items-center gap-3 px-1">
          {LEGEND.map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${cls}`} />
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Gün kartları */}
        {weekDays.map(day => (
          <DayCard
            key={day}
            day={day}
            appts={byDay[day] || []}
            isToday={day === today}
            startHour={startHour}
            endHour={endHour}
            onDayClick={onDayClick}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default WeekView;
